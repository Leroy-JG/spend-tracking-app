/** Jours au format `AAAA-MM-JJ` (heure locale) : l'ordre alphabétique est l'ordre chronologique. */

const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (year: number, month0: number, day: number): string => `${year}-${pad(month0 + 1)}-${pad(day)}`;

export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return toKey(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Vrai pour une vraie date du calendrier (pas de 31 février). */
export function isDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function parseKey(key: string): { year: number; month0: number; day: number } {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return { year: y, month0: m - 1, day: d };
}

export interface Range {
  /** Premier jour inclus (`null` = sans limite). */
  from: string | null;
  /** Dernier jour inclus (`null` = sans limite). */
  to: string | null;
}

export function monthRange(year: number, month0: number): Range {
  return { from: toKey(year, month0, 1), to: toKey(year, month0, new Date(year, month0 + 1, 0).getDate()) };
}

export function yearRange(year: number): Range {
  return { from: toKey(year, 0, 1), to: toKey(year, 11, 31) };
}

export function inRange(day: string, range: Range): boolean {
  return (range.from === null || day >= range.from) && (range.to === null || day <= range.to);
}

/** Décale un couple (année, mois 0-11) de `delta` mois. */
export function shiftMonth(year: number, month0: number, delta: number): { year: number; month0: number } {
  const d = new Date(year, month0 + delta, 1);
  return { year: d.getFullYear(), month0: d.getMonth() };
}
