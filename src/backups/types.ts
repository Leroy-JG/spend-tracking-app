import type { BackupInfo, BackupMeta } from '../domain/backupFile';

/** Historique des copies, gardé sur l'appareil, dans l'espace privé de l'application (jamais envoyé ailleurs). */
export interface BackupBackend {
  /** Du plus récent au plus ancien. */
  list(): Promise<BackupMeta[]>;
  read(id: string): Promise<string | null>;
  /** Ajoute une copie sans toucher aux précédentes, puis supprime les plus anciennes au-delà de `keep`. */
  add(meta: BackupInfo, payload: string, keep: number): Promise<void>;
  remove(id: string): Promise<void>;
  /** Supprime toutes les copies. */
  eraseAll(): Promise<void>;
}
