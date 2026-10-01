/** Origine d'une copie : automatique (période), manuelle, ou faite juste avant une restauration / un import. */
export type BackupKind = 'auto' | 'manual' | 'before-restore';

/** Une copie de l'historique, sans son contenu (légère : la liste n'a pas besoin des données). */
export interface BackupMeta {
  /** Nom du fichier sans extension (il porte toute la description : voir `backupId`). */
  id: string;
  createdAt: number;
  kind: BackupKind;
  tags: number;
  entries: number;
  /** Taille du fichier (octets). */
  bytes: number;
}

/** Ce qui décrit une copie avant qu'elle soit écrite (le nom en est déduit). */
export type BackupFields = Omit<BackupMeta, 'id' | 'bytes'>;
export type BackupInfo = Omit<BackupMeta, 'bytes'>;

const KINDS: readonly BackupKind[] = ['auto', 'manual', 'before-restore'];
const EXTENSION = '.json';

/**
 * Nom d'une copie : `<horodatage ms>_<origine>_<tags>_<dépenses>.json`. Tout ce que l'historique affiche se lit dans
 * le nom : on liste les fichiers sans les ouvrir (et le dossier reste lisible sans index à tenir à jour).
 */
export function backupId(info: BackupFields): string {
  return `${info.createdAt}_${info.kind}_${info.tags}_${info.entries}`;
}

export const backupFileName = (info: BackupFields): string => backupId(info) + EXTENSION;

/** Relit un nom de fichier ; null si ce n'est pas une copie (fichier étranger, reste d'écriture interrompue…). */
export function parseBackupFileName(name: string): BackupInfo | null {
  if (!name.endsWith(EXTENSION)) return null;
  const match = /^(\d{1,15})_([a-z-]+)_(\d{1,6})_(\d{1,7})$/.exec(name.slice(0, -EXTENSION.length));
  if (!match) return null;
  const kind = KINDS.find((k) => k === match[2]);
  if (!kind) return null;
  return { id: name.slice(0, -EXTENSION.length), createdAt: Number(match[1]), kind, tags: Number(match[3]), entries: Number(match[4]) };
}

/** Nom proposé quand on exporte une copie : `sakk-sauvegarde-AAAA-MM-JJ.json` (jour local de la copie). */
export function exportFileName(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `sakk-sauvegarde-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

export const newestFirst = (a: BackupMeta, b: BackupMeta): number =>
  b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
