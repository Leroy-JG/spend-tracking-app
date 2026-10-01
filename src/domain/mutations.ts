import { MAX_NOTE, MAX_TAG_NAME, newId, validColor, DEFAULT_TAG_COLOR, type Data, type Entry, type Tag } from './types';

/** Fonctions pures : chacune renvoie de nouvelles données, sans modifier les anciennes. */

export type TagNameError = 'empty' | 'duplicate';

export function tagNameError(data: Data, name: string, exceptId?: string): TagNameError | null {
  const clean = name.trim();
  if (clean === '') return 'empty';
  const lower = clean.toLocaleLowerCase('fr');
  return data.tags.some((t) => t.id !== exceptId && t.name.toLocaleLowerCase('fr') === lower) ? 'duplicate' : null;
}

export function addTag(data: Data, name: string, color: string, id = newId()): { data: Data; tag: Tag } {
  const tag: Tag = { id, name: name.trim().slice(0, MAX_TAG_NAME), color: validColor(color) ?? DEFAULT_TAG_COLOR };
  return { data: { ...data, tags: [...data.tags, tag] }, tag };
}

export function updateTag(data: Data, id: string, patch: { name?: string; color?: string }): Data {
  return {
    ...data,
    tags: data.tags.map((t) =>
      t.id !== id
        ? t
        : {
            ...t,
            name: patch.name === undefined ? t.name : patch.name.trim().slice(0, MAX_TAG_NAME),
            color: patch.color === undefined ? t.color : (validColor(patch.color) ?? t.color),
          },
    ),
  };
}

/** Supprime le tag ET ses dépenses (l'interface demande confirmation en annonçant leur nombre). */
export function deleteTag(data: Data, id: string): Data {
  return { tags: data.tags.filter((t) => t.id !== id), entries: data.entries.filter((e) => e.tagId !== id) };
}

export interface NewEntry {
  tagId: string;
  cents: number;
  note?: string;
  day: string;
}

export function addEntry(data: Data, input: NewEntry, now: number, id = newId()): { data: Data; entry: Entry } {
  const entry: Entry = { id, tagId: input.tagId, cents: input.cents, note: (input.note ?? '').trim().slice(0, MAX_NOTE), day: input.day, createdAt: now };
  return { data: { ...data, entries: [...data.entries, entry] }, entry };
}

export function updateEntry(data: Data, id: string, patch: Partial<Omit<Entry, 'id' | 'createdAt'>>): Data {
  return {
    ...data,
    entries: data.entries.map((e) =>
      e.id !== id ? e : { ...e, ...patch, note: patch.note === undefined ? e.note : patch.note.trim().slice(0, MAX_NOTE) },
    ),
  };
}

export function deleteEntry(data: Data, id: string): Data {
  return { ...data, entries: data.entries.filter((e) => e.id !== id) };
}
