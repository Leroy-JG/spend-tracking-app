// Version mobile : chaque copie est un fichier JSON dans le dossier privé de l'application
// (`Paths.document/sauvegardes`). Aucune permission : seule l'application y accède, et Android le supprime
// avec elle (désinstallation) — d'où le bouton « Exporter dans un fichier » pour garder une copie ailleurs.
import { Directory, File, Paths } from 'expo-file-system';
import { backupFileName, newestFirst, parseBackupFileName, type BackupMeta } from '../domain/backupFile';
import type { BackupBackend } from './types';

const FOLDER = 'sauvegardes';
const TEMP = '.tmp';

const folder = () => new Directory(Paths.document, FOLDER);

function files(): File[] {
  const dir = folder();
  if (!dir.exists) return [];
  return dir.list().filter((item): item is File => item instanceof File);
}

export const backend: BackupBackend = {
  async list() {
    const metas: BackupMeta[] = [];
    for (const file of files()) {
      const info = parseBackupFileName(file.name);
      if (info) metas.push({ ...info, bytes: file.size });
      else if (file.name.endsWith(TEMP)) file.delete(); // reste d'une écriture interrompue
    }
    return metas.sort(newestFirst);
  },

  async read(id) {
    const file = new File(folder(), `${id}.json`);
    return file.exists ? file.text() : null;
  },

  async add(info, payload, keep) {
    const dir = folder();
    dir.create({ intermediates: true, idempotent: true });
    // Écrit à côté puis renomme : une copie à moitié écrite ne se fait jamais passer pour une copie.
    const name = backupFileName(info);
    const temp = new File(dir, name + TEMP);
    temp.create({ overwrite: true });
    temp.write(payload);
    temp.rename(name);
    // On ne supprime que les plus anciennes, au-delà du nombre de copies à garder.
    const all = (await this.list()).sort(newestFirst);
    for (const old of all.slice(Math.max(1, keep))) await this.remove(old.id);
  },

  async remove(id) {
    const file = new File(folder(), `${id}.json`);
    if (file.exists) file.delete();
  },

  async eraseAll() {
    const dir = folder();
    if (dir.exists) dir.delete();
  },
};
