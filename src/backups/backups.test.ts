import { describe, expect, it } from 'vitest';
import { DEFAULT_AUTO_BACKUP, dataHash, isBackupDue, nextBackupAt, normalizeAutoBackup, periodMs } from '../domain/autobackup';
import { backupFileName, backupId, exportFileName, newestFirst, parseBackupFileName, type BackupInfo, type BackupMeta } from '../domain/backupFile';
import { parseImport } from '../domain/exchange';
import type { Data } from '../domain/types';
import { readSnapshot, takeSnapshot } from './snapshots';
import type { BackupBackend } from './types';

const DAY = 24 * 60 * 60 * 1000;

const data = (cents = 1250): Data => ({
  tags: [{ id: 'a', name: 'Courses', color: '#772247' }],
  entries: [{ id: 'e1', tagId: 'a', cents, note: '', day: '2026-10-01', createdAt: 1 }],
});

/** Historique en mémoire, avec les mêmes règles que les vraies versions (fichiers / IndexedDB). */
function memoryBackend(): BackupBackend & { files: Map<string, { meta: BackupMeta; payload: string }> } {
  const files = new Map<string, { meta: BackupMeta; payload: string }>();
  const sorted = () => [...files.values()].map((f) => f.meta).sort(newestFirst);
  return {
    files,
    list: async () => sorted(),
    read: async (id) => files.get(id)?.payload ?? null,
    add: async (info: BackupInfo, payload, keep) => {
      files.set(info.id, { meta: { ...info, bytes: payload.length }, payload });
      for (const old of sorted().slice(Math.max(1, keep))) files.delete(old.id);
    },
    remove: async (id) => void files.delete(id),
    eraseAll: async () => files.clear(),
  };
}

describe('réglages des sauvegardes automatiques', () => {
  it('sont désactivés par défaut : chaque semaine, 10 copies', () => {
    expect(DEFAULT_AUTO_BACKUP).toEqual({ enabled: false, every: 1, unit: 'weeks', keep: 10, lastRunAt: null });
    expect(normalizeAutoBackup(undefined)).toEqual(DEFAULT_AUTO_BACKUP);
    expect(normalizeAutoBackup('nimporte quoi')).toEqual(DEFAULT_AUTO_BACKUP);
  });

  it('corrigent les valeurs hors bornes', () => {
    const n = normalizeAutoBackup({ enabled: true, every: 9999, unit: 'weeks', keep: 0, lastRunAt: 'x' });
    expect(n).toEqual({ enabled: true, every: 52, unit: 'weeks', keep: 1, lastRunAt: null });
    expect(normalizeAutoBackup({ every: 500, unit: 'days' }).every).toBe(365);
    expect(normalizeAutoBackup({ enabled: 'oui' }).enabled).toBe(false);
  });

  it('calculent la période et l’échéance', () => {
    expect(periodMs({ every: 2, unit: 'weeks' })).toBe(14 * DAY);
    const config = { ...DEFAULT_AUTO_BACKUP, enabled: true, every: 3, unit: 'days' as const, lastRunAt: 1000 };
    expect(nextBackupAt(config)).toBe(1000 + 3 * DAY);
    expect(nextBackupAt({ ...config, lastRunAt: null })).toBeNull();
  });

  it('n’ont jamais de copie due si elles sont désactivées', () => {
    expect(isBackupDue(DEFAULT_AUTO_BACKUP, 1e15)).toBe(false);
  });

  it('ont une copie due au premier passage, puis après le délai, ou si l’horloge a reculé', () => {
    const config = { ...DEFAULT_AUTO_BACKUP, enabled: true, every: 1, unit: 'days' as const, lastRunAt: null as number | null };
    expect(isBackupDue(config, 5)).toBe(true);
    const ran = { ...config, lastRunAt: 1000 };
    expect(isBackupDue(ran, 1000 + DAY - 1)).toBe(false);
    expect(isBackupDue(ran, 1000 + DAY)).toBe(true);
    expect(isBackupDue(ran, 500)).toBe(true);
  });
});

describe('empreinte du contenu', () => {
  it('ne dépend pas de l’ordre, mais change avec le contenu', () => {
    const a = data();
    const reordered: Data = { tags: [...a.tags], entries: [{ ...a.entries[0]!, id: 'e0', createdAt: 9 }, a.entries[0]!] };
    const swapped: Data = { ...reordered, entries: [...reordered.entries].reverse() };
    expect(dataHash(reordered)).toBe(dataHash(swapped));
    expect(dataHash(a)).toBe(dataHash(data()));
    expect(dataHash(a)).not.toBe(dataHash(data(1251)));
  });
});

describe('nom des fichiers de sauvegarde', () => {
  const info = { createdAt: 1790000000000, kind: 'auto' as const, tags: 3, entries: 42 };

  it('porte toute la description et se relit', () => {
    const name = backupFileName(info);
    expect(name).toBe('1790000000000_auto_3_42.json');
    expect(parseBackupFileName(name)).toEqual({ id: backupId(info), ...info });
    expect(parseBackupFileName('1790000000000_before-restore_0_0.json')?.kind).toBe('before-restore');
  });

  it('ignore ce qui n’est pas une copie', () => {
    for (const name of ['notes.json', '1790000000000_auto_3_42.json.tmp', '1790000000000_inconnue_3_42.json', '_auto_3_42.json', '1790000000000_auto_3_42.txt'])
      expect(parseBackupFileName(name)).toBeNull();
  });

  it('propose un nom d’export lisible', () => {
    expect(exportFileName(new Date(2026, 2, 9, 14, 5).getTime())).toBe('sakk-sauvegarde-2026-03-09.json');
  });
});

describe('copies : takeSnapshot / readSnapshot', () => {
  it('ne copie rien quand il n’y a aucune donnée', async () => {
    const backend = memoryBackend();
    expect(await takeSnapshot(backend, { tags: [], entries: [] }, 'manual', 1, 10)).toEqual({ status: 'empty' });
    expect(backend.files.size).toBe(0);
  });

  it('crée une copie relisible, identique aux données', async () => {
    const backend = memoryBackend();
    const result = await takeSnapshot(backend, data(), 'manual', 1790000000000, 10);
    expect(result.status).toBe('created');
    const [meta] = await backend.list();
    expect(meta).toMatchObject({ kind: 'manual', tags: 1, entries: 1, createdAt: 1790000000000 });
    expect(await readSnapshot(backend, meta!.id)).toEqual(data());
    expect(parseImport((await backend.read(meta!.id))!)).toEqual(data());
  });

  it('n’empile pas deux copies identiques mais empile les différentes (historique)', async () => {
    const backend = memoryBackend();
    await takeSnapshot(backend, data(100), 'auto', 1000, 10);
    expect((await takeSnapshot(backend, data(100), 'auto', 2000, 10)).status).toBe('unchanged');
    expect((await takeSnapshot(backend, data(200), 'auto', 3000, 10)).status).toBe('created');
    expect((await backend.list()).map((m) => m.createdAt)).toEqual([3000, 1000]);
  });

  it('ne supprime que les plus anciennes au-delà du nombre gardé', async () => {
    const backend = memoryBackend();
    for (let i = 1; i <= 5; i++) await takeSnapshot(backend, data(i * 100), 'auto', i * 1000, 3);
    expect((await backend.list()).map((m) => m.createdAt)).toEqual([5000, 4000, 3000]);
  });

  it('évite deux copies de même nom dans la même milliseconde', async () => {
    const backend = memoryBackend();
    await takeSnapshot(backend, data(100), 'manual', 5000, 10);
    await takeSnapshot(backend, data(200), 'manual', 5000, 10);
    expect(new Set((await backend.list()).map((m) => m.id)).size).toBe(2);
  });

  it('refait une copie quand la dernière est illisible', async () => {
    const backend = memoryBackend();
    await takeSnapshot(backend, data(100), 'auto', 1000, 10);
    const [meta] = await backend.list();
    backend.files.get(meta!.id)!.payload = '{ pas du json';
    expect((await takeSnapshot(backend, data(100), 'auto', 2000, 10)).status).toBe('created');
    await expect(readSnapshot(backend, meta!.id)).rejects.toThrow();
  });

  it('renvoie null pour une copie disparue', async () => {
    expect(await readSnapshot(memoryBackend(), 'inconnue')).toBeNull();
  });
});
