import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { dayKey } from '../domain/dates';
import { addEntry as addEntryTo, addTag as addTagTo, deleteEntry as deleteEntryFrom, deleteTag as deleteTagFrom, updateEntry as updateEntryIn, updateTag as updateTagIn, type NewEntry } from '../domain/mutations';
import { sortRecent, summarizeDays, type DaySummary } from '../domain/stats';
import { EMPTY_DATA, type Data, type Entry, type Tag } from '../domain/types';
import { eraseData, loadData, saveData } from '../storage';

interface Store {
  ready: boolean;
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
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Data>(EMPTY_DATA);
  const [saveFailed, setSaveFailed] = useState(false);
  // La référence porte toujours la dernière version : deux actions rapprochées ne s'écrasent pas.
  const latest = useRef<Data>(EMPTY_DATA);
  // Les écritures passent l'une après l'autre : la dernière enregistrée est toujours la plus récente.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let alive = true;
    void loadData().then((loaded) => {
      if (!alive) return;
      latest.current = loaded;
      setData(loaded);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const commit = useCallback((next: Data, write: () => Promise<boolean> = () => saveData(next)) => {
    latest.current = next;
    setData(next);
    queue.current = queue.current.then(write).then((ok) => setSaveFailed(!ok));
  }, []);

  const mutate = useCallback((fn: (d: Data) => Data) => commit(fn(latest.current)), [commit]);

  const api = useMemo<Store>(() => {
    return {
      ready,
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
      replaceAll: (next) => commit(next),
      eraseAll: () => commit(EMPTY_DATA, eraseData),
    };
  }, [ready, data, saveFailed, mutate, commit]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore doit être utilisé dans <StoreProvider>');
  return store;
}

/** Jour par défaut d'une nouvelle dépense : aujourd'hui (recalculé à chaque appel : l'app peut rester ouverte passé minuit). */
export const today = (): string => dayKey(Date.now());
