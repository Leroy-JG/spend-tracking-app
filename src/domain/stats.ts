import { inRange, type Range } from './dates';
import type { Data, Entry, Tag } from './types';

/** Du plus récent au plus ancien : par jour, puis par moment de saisie. */
export function sortRecent(entries: readonly Entry[]): Entry[] {
  return [...entries].sort((a, b) => (a.day !== b.day ? (a.day < b.day ? 1 : -1) : b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1)));
}

export interface DaySummary {
  cents: number;
  count: number;
  /** Tags du jour, du plus dépensé au moins dépensé. */
  tagIds: string[];
}

/** Total par jour (calendrier et en-têtes de l'historique). */
export function summarizeDays(entries: readonly Entry[]): Map<string, DaySummary> {
  const perDay = new Map<string, { cents: number; count: number; byTag: Map<string, number> }>();
  for (const e of entries) {
    let d = perDay.get(e.day);
    if (!d) perDay.set(e.day, (d = { cents: 0, count: 0, byTag: new Map() }));
    d.cents += e.cents;
    d.count += 1;
    d.byTag.set(e.tagId, (d.byTag.get(e.tagId) ?? 0) + e.cents);
  }
  const out = new Map<string, DaySummary>();
  for (const [day, d] of perDay) {
    out.set(day, { cents: d.cents, count: d.count, tagIds: [...d.byTag].sort((a, b) => b[1] - a[1]).map(([id]) => id) });
  }
  return out;
}

export interface Filter {
  range: Range;
  /** Tags retenus ; ensemble vide = tous les tags. */
  tagIds: ReadonlySet<string>;
}

export function filterEntries(entries: readonly Entry[], filter: Filter): Entry[] {
  return entries.filter((e) => inRange(e.day, filter.range) && (filter.tagIds.size === 0 || filter.tagIds.has(e.tagId)));
}

export interface TagTotal {
  tag: Tag;
  cents: number;
  count: number;
  /** Part du total (0–1). */
  share: number;
}

export interface Summary {
  cents: number;
  count: number;
  byTag: TagTotal[];
}

/**
 * Combien dépensé sur une période, pour un ou plusieurs tags. Les tags choisis apparaissent même à 0 € ;
 * sans choix (tous les tags), seuls ceux qui ont des dépenses apparaissent. Du plus dépensé au moins dépensé.
 */
export function summarize(data: Data, filter: Filter): Summary {
  const rows = filterEntries(data.entries, filter);
  const sums = new Map<string, { cents: number; count: number }>();
  let cents = 0;
  for (const e of rows) {
    const s = sums.get(e.tagId) ?? { cents: 0, count: 0 };
    s.cents += e.cents;
    s.count += 1;
    sums.set(e.tagId, s);
    cents += e.cents;
  }
  const byTag: TagTotal[] = [];
  for (const tag of data.tags) {
    const s = sums.get(tag.id);
    if (!s && filter.tagIds.size === 0) continue;
    if (filter.tagIds.size > 0 && !filter.tagIds.has(tag.id)) continue;
    byTag.push({ tag, cents: s?.cents ?? 0, count: s?.count ?? 0, share: cents > 0 ? (s?.cents ?? 0) / cents : 0 });
  }
  byTag.sort((a, b) => b.cents - a.cents || a.tag.name.localeCompare(b.tag.name, 'fr'));
  return { cents, count: rows.length, byTag };
}
