import { MAX_CENTS } from './types';

/**
 * Texte saisi → centimes ; `null` si ce n'est pas un montant valide (> 0, au plus 2 décimales, ≤ MAX_CENTS).
 * Accepte la virgule ou le point comme séparateur, et les espaces (« 1 234,5 »).
 */
export function parseAmount(text: string): number | null {
  const clean = text.replace(/[\s  ]/g, '').replace(',', '.');
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(clean)) return null;
  const [int = '', frac = ''] = clean.split('.');
  if (int.length > 9) return null;
  const cents = (int === '' ? 0 : parseInt(int, 10)) * 100 + parseInt((frac + '00').slice(0, 2), 10);
  return cents > 0 && cents <= MAX_CENTS ? cents : null;
}

/** Nettoie une saisie au clavier : chiffres et un seul séparateur (virgule), 2 décimales, 7 chiffres entiers au plus. */
export function sanitizeAmountInput(text: string): string {
  const normalized = text.replace(/\./g, ',').replace(/[^\d,]/g, '');
  const comma = normalized.indexOf(',');
  if (comma === -1) return normalized.slice(0, 7);
  const int = normalized.slice(0, comma).slice(0, 7);
  const frac = normalized.slice(comma + 1).replace(/,/g, '').slice(0, 2);
  return `${int},${frac}`;
}

/** 123456 → « 1 234,56 € » (espaces insécables : le montant ne se coupe jamais en fin de ligne). */
export function formatAmount(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const int = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${int},${String(abs % 100).padStart(2, '0')} €`;
}

/** Centimes → texte pour un champ de saisie (1250 → « 12,5 », 1200 → « 12 »). */
export function amountToInput(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  if (frac === 0) return String(whole);
  return `${whole},${String(frac).padStart(2, '0').replace(/0$/, '')}`;
}
