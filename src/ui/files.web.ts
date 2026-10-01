// Version web / PWA : téléchargement d'un fichier et sélecteur de fichier du navigateur.
import { ImportError } from '../domain/exchange';

/** Au-delà, ce n'est pas une sauvegarde de l'application (et on ne lit pas un fichier géant en mémoire). */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export async function shareText(filename: string, content: string): Promise<boolean> {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function pickTextFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > MAX_FILE_BYTES) return reject(new ImportError('too_big'));
      resolve(await file.text());
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
