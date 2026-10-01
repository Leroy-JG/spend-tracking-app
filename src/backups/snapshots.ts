import { dataHash } from '../domain/autobackup';
import { backupId, type BackupInfo, type BackupKind, type BackupMeta } from '../domain/backupFile';
import { exportData, parseImport } from '../domain/exchange';
import type { Data } from '../domain/types';
import type { BackupBackend } from './types';

export type SnapshotResult =
  | { status: 'created'; meta: BackupInfo }
  /** Le contenu est identique à la dernière copie : on n'en empile pas une seconde. */
  | { status: 'unchanged'; meta: BackupMeta }
  /** Rien à sauvegarder. */
  | { status: 'empty' };

/** Même contenu que la copie `meta` ? (Une copie illisible compte comme différente : on en refait une.) */
async function sameAs(backend: BackupBackend, meta: BackupMeta, data: Data): Promise<boolean> {
  try {
    const payload = await backend.read(meta.id);
    return payload !== null && dataHash(parseImport(payload)) === dataHash(data);
  } catch {
    return false;
  }
}

/**
 * Ajoute une copie de `data` à l'historique. Les copies précédentes ne sont jamais écrasées : seules les plus
 * anciennes, au-delà de `keep`, sont supprimées. Une copie identique à la dernière n'est pas empilée.
 */
export async function takeSnapshot(
  backend: BackupBackend,
  data: Data,
  kind: BackupKind,
  now: number,
  keep: number,
): Promise<SnapshotResult> {
  if (data.tags.length === 0 && data.entries.length === 0) return { status: 'empty' };
  const latest = (await backend.list())[0];
  if (latest && (await sameAs(backend, latest, data))) return { status: 'unchanged', meta: latest };

  // Deux copies dans la même milliseconde (même origine) porteraient le même nom : on avance d'une milliseconde.
  const taken = new Set((await backend.list()).map((m) => m.id));
  let createdAt = now;
  const info = () => ({ createdAt, kind, tags: data.tags.length, entries: data.entries.length });
  while (taken.has(backupId(info()))) createdAt += 1;
  const meta = { id: backupId(info()), ...info() };
  await backend.add(meta, exportData(data, createdAt, true), keep);
  return { status: 'created', meta };
}

/**
 * Lit et valide le contenu d'une copie (elle peut être illisible). Renvoie null si la copie n'existe plus.
 * Lève `ImportError` si son contenu est invalide.
 */
export async function readSnapshot(backend: BackupBackend, id: string): Promise<Data | null> {
  const payload = await backend.read(id);
  return payload === null ? null : parseImport(payload);
}
