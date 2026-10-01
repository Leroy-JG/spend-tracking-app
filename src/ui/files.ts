// Version mobile : tout passe par de vrais fichiers JSON. Exporter = écrire le fichier puis ouvrir la feuille de
// partage du système (Fichiers, Drive, e-mail…) ; importer = choisir un fichier avec le sélecteur du système.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ImportError } from '../domain/exchange';

/** Au-delà, ce n'est pas une sauvegarde de l'application (et on ne lit pas un fichier géant en mémoire). */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Renvoie false si le partage n'est pas possible sur cet appareil. Lève une erreur si le fichier ne s'écrit pas. */
export async function shareText(filename: string, content: string): Promise<boolean> {
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: filename });
  return true;
}

/** Contenu du fichier choisi, ou null si l'utilisateur a fermé le sélecteur. */
export async function pickTextFile(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', 'application/octet-stream', '*/*'] });
  if (picked.canceled) return null;
  if (picked.result.size > MAX_FILE_BYTES) throw new ImportError('too_big');
  return picked.result.text();
}
