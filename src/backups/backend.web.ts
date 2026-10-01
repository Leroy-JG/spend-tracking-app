// Version web / PWA : un navigateur ne donne pas de dossier à écrire. Les copies sont des « fichiers » gardés dans
// IndexedDB (l'espace privé du site), pas dans localStorage : son quota (~5 Mo) est partagé avec les données
// principales, dont l'écriture ne doit jamais échouer à cause des copies. Elles s'exportent en vrais fichiers.
import { newestFirst, type BackupMeta } from '../domain/backupFile';
import type { BackupBackend } from './types';

const DB_NAME = 'sakk-backups';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const factory = globalThis.indexedDB;
    if (!factory) return reject(new Error('IndexedDB indisponible'));
    const request = factory.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('meta', { keyPath: 'id' });
      request.result.createObjectStore('payloads');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const wait = <T,>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** Ouvre la base le temps d'une transaction puis la referme (une base ouverte empêcherait de l'effacer). */
async function inDb<T>(mode: IDBTransactionMode, run: (meta: IDBObjectStore, payloads: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(['meta', 'payloads'], mode);
    const finished = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    finished.catch(() => undefined); // si `run` échoue avant qu'on l'attende : pas de rejet sans écouteur
    const result = await run(tx.objectStore('meta'), tx.objectStore('payloads'));
    await finished;
    return result;
  } finally {
    db.close();
  }
}

export const backend: BackupBackend = {
  async list() {
    const all = await inDb('readonly', (meta) => wait(meta.getAll() as IDBRequest<BackupMeta[]>));
    return all.sort(newestFirst);
  },

  async read(id) {
    const payload = await inDb('readonly', (_meta, payloads) => wait(payloads.get(id) as IDBRequest<string | undefined>));
    return payload ?? null;
  },

  async add(info, payload, keep) {
    await inDb('readwrite', async (metas, payloads) => {
      metas.put({ ...info, bytes: new Blob([payload]).size } satisfies BackupMeta);
      payloads.put(payload, info.id);
      const all = (await wait(metas.getAll() as IDBRequest<BackupMeta[]>)).sort(newestFirst);
      // On ne supprime que les plus anciennes, au-delà du nombre de copies à garder.
      for (const old of all.slice(Math.max(1, keep))) {
        metas.delete(old.id);
        payloads.delete(old.id);
      }
    });
  },

  async remove(id) {
    await inDb('readwrite', async (metas, payloads) => {
      metas.delete(id);
      payloads.delete(id);
    });
  },

  async eraseAll() {
    await new Promise<void>((resolve) => {
      const request = globalThis.indexedDB?.deleteDatabase(DB_NAME);
      if (!request) return resolve();
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  },
};
