import { isDayKey } from './dates';
import {
  MAX_CENTS,
  MAX_ENTRIES,
  MAX_NOTE,
  MAX_TAGS,
  MAX_TAG_NAME,
  DEFAULT_TAG_COLOR,
  validColor,
  type Data,
  type Entry,
  type Tag,
} from './types';

export const EXPORT_APP = 'spend-tracking';
export const EXPORT_VERSION = 1;

export interface ExportFile extends Data {
  app: typeof EXPORT_APP;
  version: number;
  exportedAt: number;
}

export function exportData(data: Data, now: number): string {
  const file: ExportFile = { app: EXPORT_APP, version: EXPORT_VERSION, exportedAt: now, tags: data.tags, entries: data.entries };
  return JSON.stringify(file, null, 2);
}

export class ImportError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function readTag(raw: unknown): Tag | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || raw.id === '' || typeof raw.name !== 'string') return null;
  const name = raw.name.trim().slice(0, MAX_TAG_NAME);
  if (name === '') return null;
  return { id: raw.id, name, color: validColor(raw.color) ?? DEFAULT_TAG_COLOR };
}

function readEntry(raw: unknown): Entry | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || raw.id === '' || typeof raw.tagId !== 'string') return null;
  const { cents, day, createdAt } = raw;
  if (typeof cents !== 'number' || !Number.isInteger(cents) || cents <= 0 || cents > MAX_CENTS) return null;
  if (!isDayKey(day)) return null;
  return {
    id: raw.id,
    tagId: raw.tagId,
    cents,
    day,
    note: typeof raw.note === 'string' ? raw.note.slice(0, MAX_NOTE) : '',
    createdAt: typeof createdAt === 'number' && Number.isFinite(createdAt) ? createdAt : 0,
  };
}

/**
 * Valide des données lues (stockage ou fichier d'import).
 * `strict` : au moindre élément invalide, `ImportError` (un fichier importé est accepté en entier ou refusé).
 * Sinon on écarte seulement ce qui est abîmé (le stockage local ne doit jamais empêcher d'ouvrir l'app).
 */
export function readData(raw: unknown, strict: boolean): Data {
  const fail = (code: string): never => {
    throw new ImportError(code);
  };
  if (!isObject(raw)) return strict ? fail('invalid_format') : { tags: [], entries: [] };
  const rawTags = Array.isArray(raw.tags) ? raw.tags : strict ? fail('invalid_format') : [];
  const rawEntries = Array.isArray(raw.entries) ? raw.entries : strict ? fail('invalid_format') : [];
  if (rawTags.length > MAX_TAGS || rawEntries.length > MAX_ENTRIES) return strict ? fail('too_big') : { tags: [], entries: [] };

  const tags: Tag[] = [];
  const tagIds = new Set<string>();
  for (const item of rawTags) {
    const tag = readTag(item);
    if (!tag || tagIds.has(tag.id)) {
      if (strict) fail('invalid_data');
      continue;
    }
    tagIds.add(tag.id);
    tags.push(tag);
  }

  const entries: Entry[] = [];
  const entryIds = new Set<string>();
  for (const item of rawEntries) {
    const entry = readEntry(item);
    if (!entry || entryIds.has(entry.id) || !tagIds.has(entry.tagId)) {
      if (strict) fail('invalid_data');
      continue;
    }
    entryIds.add(entry.id);
    entries.push(entry);
  }
  return { tags, entries };
}

/** Lit un fichier de sauvegarde exporté par l'application. */
export function parseImport(text: string): Data {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ImportError('invalid_json');
  }
  if (!isObject(raw) || raw.app !== EXPORT_APP) throw new ImportError('invalid_format');
  return readData(raw, true);
}
