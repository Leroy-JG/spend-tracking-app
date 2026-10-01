import { describe, expect, it } from 'vitest';
import { dayLabel, formatDate, formatMonth, tn } from './index';

describe('libellés de dates', () => {
  // Jeudi 12 mars 2026, midi (heure locale).
  const now = new Date(2026, 2, 12, 12).getTime();

  it('aujourd’hui et hier', () => {
    expect(dayLabel('2026-03-12', now)).toBe('Aujourd’hui');
    expect(dayLabel('2026-03-11', now)).toBe('Hier');
  });

  it('hier à cheval sur deux mois ou deux années', () => {
    expect(dayLabel('2026-02-28', new Date(2026, 2, 1, 0, 30).getTime())).toBe('Hier');
    expect(dayLabel('2025-12-31', new Date(2026, 0, 1, 0, 30).getTime())).toBe('Hier');
  });

  it('jour de la semaine ; l’année seulement si ce n’est pas l’année en cours', () => {
    expect(dayLabel('2026-03-09', now)).toBe('lundi 9 mars');
    expect(dayLabel('2026-03-01', now)).toBe('dimanche 1er mars');
    expect(dayLabel('2020-01-02', now)).toBe('jeudi 2 janvier 2020');
  });

  it('format long et mois', () => {
    expect(formatDate('2026-03-01')).toBe('1er mars 2026');
    expect(formatDate('2026-12-25')).toBe('25 décembre 2026');
    expect(formatMonth(2026, 0)).toBe('Janvier 2026');
  });

  it('pluriel à la française : 0 et 1 au singulier', () => {
    expect(tn('count.entry', 0)).toBe('0 dépense');
    expect(tn('count.entry', 1)).toBe('1 dépense');
    expect(tn('count.entry', 2)).toBe('2 dépenses');
  });
});
