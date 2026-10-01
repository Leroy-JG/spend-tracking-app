/** Une étiquette (tag) choisie à la main pour ranger les dépenses : « Courses », « Transport »… */
export interface Tag {
  id: string;
  name: string;
  /** Couleur `#RRGGBB`. */
  color: string;
}

/** Une dépense. Le montant est un entier de centimes (jamais de nombre à virgule : pas d'erreur d'arrondi). */
export interface Entry {
  id: string;
  tagId: string;
  cents: number;
  /** Note facultative (chaîne vide si absente). */
  note: string;
  /** Jour de la dépense, `AAAA-MM-JJ` (heure locale). */
  day: string;
  /** Moment de la saisie (ms), pour ordonner les dépenses d'un même jour. */
  createdAt: number;
}

export interface Data {
  tags: Tag[];
  entries: Entry[];
}

export const EMPTY_DATA: Data = { tags: [], entries: [] };

/** 9 999 999,99 € : au-delà, c'est une faute de frappe. */
export const MAX_CENTS = 999_999_999;
export const MAX_TAG_NAME = 40;
export const MAX_NOTE = 500;
export const MAX_TAGS = 200;
export const MAX_ENTRIES = 200_000;

export const DEFAULT_TAG_COLOR = '#772247';

export function validColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : null;
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
