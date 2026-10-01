import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { backend } from '../backups/backend';
import { readSnapshot, takeSnapshot, type SnapshotResult } from '../backups/snapshots';
import { isBackupDue, normalizeAutoBackup, type AutoBackupSettings } from '../domain/autobackup';
import type { BackupKind, BackupMeta } from '../domain/backupFile';
import { dayKey } from '../domain/dates';
import { addEntry as addEntryTo, addTag as addTagTo, deleteEntry as deleteEntryFrom, deleteTag as deleteTagFrom, updateEntry as updateEntryIn, updateTag as updateTagIn, type NewEntry } from '../domain/mutations';
import { sortRecent, summarizeDays, type DaySummary } from '../domain/stats';
import { EMPTY_DATA, type Data, type Entry, type Tag } from '../domain/types';
import { DEFAULT_SETTINGS, eraseData, eraseSettings, loadData, loadSettings, saveData, saveSettings, type Settings } from '../storage';

export type SnapshotOutcome = SnapshotResult | { status: 'failed' };

interface Store {
  ready: boolean;
  settings: Settings;
  /** Copies de l'historique, de la plus récente à la plus ancienne. */
  backups: BackupMeta[];
  data: Data;
  /** Dépenses du plus récent au plus ancien. */
  recent: Entry[];
  tagById: Map<string, Tag>;
  days: Map<string, DaySummary>;
  /** Vrai si la dernière écriture sur l'appareil a échoué (les changements risquent d'être perdus). */
  saveFailed: boolean;
  addEntry(input: NewEntry): void;
  updateEntry(id: string, patch: Partial<Omit<Entry, 'id' | 'createdAt'>>): void;
  deleteEntry(id: string): void;
  addTag(name: string, color: string): Tag;
  updateTag(id: string, patch: { name?: string; color?: string }): void;
  deleteTag(id: string): void;
  replaceAll(data: Data): void;
  eraseAll(): void;
  setAutoBackup(patch: Partial<Pick<AutoBackupSettings, 'enabled' | 'every' | 'unit' | 'keep'>>): void;
  /** Ajoute une copie manuelle à l'historique. */
  backupNow(): Promise<SnapshotOutcome>;
  /** Remplace les données par celles d'une copie (l'état actuel est d'abord gardé dans l'historique). Faux si elle est illisible. */
  restoreBackup(id: string): Promise<boolean>;
  deleteBackup(id: string): Promise<void>;
  readBackup(id: string): Promise<string | null>;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Data>(EMPTY_DATA);
  const [saveFailed, setSaveFailed] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  // La référence porte toujours la dernière version : deux actions rapprochées ne s'écrasent pas.
  const latest = useRef<Data>(EMPTY_DATA);
  // Les écritures passent l'une après l'autre : la dernière enregistrée est toujours la plus récente.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  /** Met une tâche dans la file des écritures ; elle ne la bloque jamais, même si elle échoue. */
  const enqueue = useCallback((task: () => Promise<void>) => {
    queue.current = queue.current.then(task).catch((e) => console.warn('Tâche d’enregistrement échouée', e));
  }, []);

  const refreshBackups = useCallback(async () => {
    try {
      setBackups(await backend.list());
    } catch (e) {
      console.warn('Historique des copies illisible', e);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadData(), loadSettings()]).then(([loaded, loadedSettings]) => {
      if (!alive) return;
      latest.current = loaded;
      settingsRef.current = loadedSettings;
      setData(loaded);
      setSettingsState(loadedSettings);
      setReady(true);
      void refreshBackups();
    });
    return () => {
      alive = false;
    };
  }, [refreshBackups]);

  const commit = useCallback((next: Data, write: () => Promise<boolean> = () => saveData(next)) => {
    latest.current = next;
    setData(next);
    queue.current = queue.current.then(write).then((ok) => setSaveFailed(!ok));
  }, []);

  const mutate = useCallback((fn: (d: Data) => Data) => commit(fn(latest.current)), [commit]);

  /** Point d'entrée unique des réglages : la référence reste à jour pour les traitements asynchrones. */
  const updateSettings = useCallback(
    (fn: (current: Settings) => Settings) => {
      const next = fn(settingsRef.current);
      settingsRef.current = next;
      setSettingsState(next);
      enqueue(async () => void (await saveSettings(next)));
    },
    [enqueue],
  );

  /**
   * Fait une copie, dans la file des écritures (elle voit donc les données à jour). Une copie automatique vérifie
   * à nouveau qu'elle est due : plusieurs déclencheurs proches (ouverture, retour au premier plan) n'en font qu'une.
   * Le délai repart à chaque copie automatique réussie ou inutile (contenu inchangé), jamais quand il n'y a rien à copier.
   */
  const runSnapshot = useCallback(
    (kind: BackupKind): Promise<SnapshotOutcome | null> =>
      new Promise((resolve) => {
        enqueue(async () => {
          try {
            const now = Date.now();
            const config = settingsRef.current.autoBackup;
            if (kind === 'auto' && !isBackupDue(config, now)) return resolve(null);
            const result = await takeSnapshot(backend, latest.current, kind, now, config.keep);
            const restartsTimer = (kind === 'auto' && result.status !== 'empty') || (kind === 'manual' && result.status === 'created');
            if (restartsTimer) updateSettings((s) => ({ ...s, autoBackup: { ...s.autoBackup, lastRunAt: now } }));
            if (result.status === 'created') await refreshBackups();
            resolve(result);
          } catch (e) {
            console.warn('Copie impossible', e);
            resolve({ status: 'failed' });
          }
        });
      }),
    [enqueue, updateSettings, refreshBackups],
  );

  // Copie automatique : à l'ouverture, puis à chaque retour au premier plan (l'application n'a pas de tâche de fond).
  useEffect(() => {
    if (!ready) return;
    const check = () => {
      if (isBackupDue(settingsRef.current.autoBackup, Date.now())) void runSnapshot('auto');
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => subscription.remove();
  }, [ready, runSnapshot]);

  /** Remplace toutes les données (import, restauration) : l'état actuel est d'abord gardé dans l'historique. */
  const replaceAllData = useCallback(
    (next: Data) => {
      const before = latest.current;
      enqueue(async () => {
        await takeSnapshot(backend, before, 'before-restore', Date.now(), settingsRef.current.autoBackup.keep);
        await refreshBackups();
      });
      commit(next);
    },
    [enqueue, commit, refreshBackups],
  );

  const api = useMemo<Store>(() => {
    return {
      ready,
      settings,
      backups,
      data,
      recent: sortRecent(data.entries),
      tagById: new Map(data.tags.map((t) => [t.id, t])),
      days: summarizeDays(data.entries),
      saveFailed,
      addEntry: (input) => mutate((d) => addEntryTo(d, input, Date.now()).data),
      updateEntry: (id, patch) => mutate((d) => updateEntryIn(d, id, patch)),
      deleteEntry: (id) => mutate((d) => deleteEntryFrom(d, id)),
      addTag: (name, color) => {
        const { data: next, tag } = addTagTo(latest.current, name, color);
        commit(next);
        return tag;
      },
      updateTag: (id, patch) => mutate((d) => updateTagIn(d, id, patch)),
      deleteTag: (id) => mutate((d) => deleteTagFrom(d, id)),
      replaceAll: replaceAllData,
      eraseAll: () => {
        settingsRef.current = DEFAULT_SETTINGS;
        setSettingsState(DEFAULT_SETTINGS);
        setBackups([]);
        // Données, réglages ET copies : « effacer » ne laisse rien sur l'appareil.
        commit(EMPTY_DATA, async () => {
          const results = await Promise.all([eraseData(), eraseSettings(), backend.eraseAll().then(() => true, () => false)]);
          return results.every(Boolean);
        });
      },
      setAutoBackup: (patch) => {
        const before = settingsRef.current.autoBackup;
        const after = normalizeAutoBackup({ ...before, ...patch });
        updateSettings((s) => ({ ...s, autoBackup: after }));
        // En l'activant : une première copie tout de suite, pour voir l'historique se remplir.
        if (after.enabled && !before.enabled) void runSnapshot('auto');
      },
      backupNow: async () => (await runSnapshot('manual')) ?? { status: 'failed' },
      restoreBackup: async (id) => {
        try {
          const restored = await readSnapshot(backend, id);
          if (restored) replaceAllData(restored);
          return restored !== null;
        } catch (e) {
          console.warn('Restauration impossible', e);
          return false;
        }
      },
      deleteBackup: (id) =>
        new Promise<void>((resolve) => {
          enqueue(async () => {
            try {
              await backend.remove(id);
              await refreshBackups();
            } finally {
              resolve();
            }
          });
        }),
      readBackup: (id) => backend.read(id).catch(() => null),
    };
  }, [ready, settings, backups, data, saveFailed, mutate, commit, enqueue, updateSettings, runSnapshot, replaceAllData, refreshBackups]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return store;
}

/** Jour par défaut d'une nouvelle dépense : aujourd'hui (recalculé à chaque appel : l'app peut rester ouverte passé minuit). */
export const today = (): string => dayKey(Date.now());
