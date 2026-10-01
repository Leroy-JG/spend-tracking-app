import { describe, expect, it } from 'vitest';
import { amountToInput, formatAmount, parseAmount, sanitizeAmountInput } from './amount';
import { inRange, isDayKey, monthRange, shiftMonth, yearRange } from './dates';
import { exportData, ImportError, parseImport, readData } from './exchange';
import { addEntry, addTag, deleteEntry, deleteTag, tagNameError, updateEntry, updateTag } from './mutations';
import { filterEntries, sortRecent, summarize, summarizeDays } from './stats';
import { EMPTY_DATA, type Data } from './types';

const NBSP = ' ';
const NNBSP = ' ';

describe('montants', () => {
  it('lit la virgule, le point et les espaces', () => {
    expect(parseAmount('12,50')).toBe(1250);
    expect(parseAmount('12.5')).toBe(1250);
    expect(parseAmount('1 234,56')).toBe(123456);
    expect(parseAmount('7')).toBe(700);
    expect(parseAmount(',5')).toBe(50);
    expect(parseAmount('12,')).toBe(1200);
  });

  it('refuse ce qui n’est pas un montant', () => {
    for (const bad of ['', 'abc', '0', '0,00', '-5', '1,234', '1,2,3', '12 €', '99999999999', '10000000']) {
      expect(parseAmount(bad), bad).toBeNull();
    }
    expect(parseAmount('9999999,99')).toBe(999_999_999);
  });

  it('ne fait aucune erreur d’arrondi (0,1 + 0,2)', () => {
    expect((parseAmount('0,1') ?? 0) + (parseAmount('0,2') ?? 0)).toBe(30);
  });

  it('nettoie la saisie au clavier', () => {
    expect(sanitizeAmountInput('12.345')).toBe('12,34');
    expect(sanitizeAmountInput('1a2,3,4')).toBe('12,34');
    expect(sanitizeAmountInput('12345678')).toBe('1234567');
    expect(sanitizeAmountInput('€')).toBe('');
  });

  it('formate à la française', () => {
    expect(formatAmount(1250)).toBe(`12,50${NBSP}€`);
    expect(formatAmount(0)).toBe(`0,00${NBSP}€`);
    expect(formatAmount(123456)).toBe(`1${NNBSP}234,56${NBSP}€`);
    expect(formatAmount(100000000)).toBe(`1${NNBSP}000${NNBSP}000,00${NBSP}€`);
  });

  it('remet un montant dans un champ de saisie (aller-retour sans perte)', () => {
    expect(amountToInput(1250)).toBe('12,5');
    expect(amountToInput(1200)).toBe('12');
    expect(amountToInput(1205)).toBe('12,05');
    for (const c of [1, 5, 10, 99, 100, 1250, 1205, 999_999_999]) expect(parseAmount(amountToInput(c))).toBe(c);
  });
});

describe('dates', () => {
  it('reconnaît les vraies dates seulement', () => {
    expect(isDayKey('2026-02-28')).toBe(true);
    expect(isDayKey('2028-02-29')).toBe(true);
    expect(isDayKey('2026-02-29')).toBe(false);
    expect(isDayKey('2026-13-01')).toBe(false);
    expect(isDayKey('26-01-01')).toBe(false);
    expect(isDayKey(20260101)).toBe(false);
  });

  it('calcule les bornes d’un mois et d’une année', () => {
    expect(monthRange(2026, 1)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthRange(2028, 1).to).toBe('2028-02-29');
    expect(yearRange(2026)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('borne incluse des deux côtés, ouverte si null', () => {
    const r = { from: '2026-03-01', to: '2026-03-31' };
    expect(inRange('2026-03-01', r)).toBe(true);
    expect(inRange('2026-03-31', r)).toBe(true);
    expect(inRange('2026-02-28', r)).toBe(false);
    expect(inRange('2026-04-01', r)).toBe(false);
    expect(inRange('1999-01-01', { from: null, to: '2026-01-01' })).toBe(true);
    expect(inRange('2999-01-01', { from: null, to: null })).toBe(true);
  });

  it('change de mois en passant l’année', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month0: 11 });
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month0: 0 });
  });
});

/** Jeu de données : 3 tags, dépenses sur 2 mois. */
function sample(): Data {
  let d: Data = EMPTY_DATA;
  const tags = ['Courses', 'Transport', 'Loisirs'].map((name, i) => {
    const r = addTag(d, name, '#26428B', `t${i}`);
    d = r.data;
    return r.tag;
  });
  const add = (tag: number, cents: number, day: string, at: number, note = '') => {
    d = addEntry(d, { tagId: tags[tag]!.id, cents, day, note }, at, `e${at}`).data;
  };
  add(0, 4000, '2026-03-02', 1);
  add(0, 2550, '2026-03-15', 2, 'marché');
  add(1, 1200, '2026-03-15', 3);
  add(2, 3000, '2026-03-31', 4);
  add(1, 500, '2026-04-01', 5);
  add(0, 999, '2026-04-10', 6);
  return d;
}

describe('étiquettes', () => {
  it('refuse un nom vide ou en double (sans tenir compte de la casse)', () => {
    const d = sample();
    expect(tagNameError(d, '   ')).toBe('empty');
    expect(tagNameError(d, 'courses')).toBe('duplicate');
    expect(tagNameError(d, 'Courses', 't0')).toBeNull(); // renommer en gardant son nom
    expect(tagNameError(d, 'Santé')).toBeNull();
  });

  it('renomme et recolore', () => {
    const d = updateTag(sample(), 't0', { name: '  Alimentation ', color: '#a3303f' });
    expect(d.tags[0]).toEqual({ id: 't0', name: 'Alimentation', color: '#A3303F' });
    expect(updateTag(d, 't0', { color: 'rouge' }).tags[0]?.color).toBe('#A3303F');
  });

  it('supprimer un tag supprime ses dépenses, pas celles des autres', () => {
    const d = deleteTag(sample(), 't0');
    expect(d.tags.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(d.entries.every((e) => e.tagId !== 't0')).toBe(true);
    expect(d.entries).toHaveLength(3);
  });
});

describe('dépenses', () => {
  it('ajoute, modifie, supprime sans toucher aux données d’origine', () => {
    const before = sample();
    const { data: after, entry } = addEntry(before, { tagId: 't2', cents: 100, day: '2026-05-01', note: '  café  ' }, 99, 'x');
    expect(before.entries).toHaveLength(6);
    expect(entry.note).toBe('café');
    const edited = updateEntry(after, 'x', { cents: 250, note: 'thé' });
    expect(edited.entries.find((e) => e.id === 'x')).toMatchObject({ cents: 250, note: 'thé', createdAt: 99 });
    expect(deleteEntry(edited, 'x').entries).toHaveLength(6);
  });

  it('classe du plus récent au plus ancien, puis par heure de saisie', () => {
    const order = sortRecent(sample().entries).map((e) => e.id);
    expect(order).toEqual(['e6', 'e5', 'e4', 'e3', 'e2', 'e1']);
  });

  it('totalise par jour, avec les tags du jour du plus au moins dépensé', () => {
    const days = summarizeDays(sample().entries);
    expect(days.get('2026-03-15')).toEqual({ cents: 3750, count: 2, tagIds: ['t0', 't1'] });
    expect(days.get('2026-03-03')).toBeUndefined();
  });
});

describe('suivi par période et par tags', () => {
  const noTags = new Set<string>();

  it('total d’un mois, tous tags confondus', () => {
    const s = summarize(sample(), { range: monthRange(2026, 2), tagIds: noTags });
    expect(s.cents).toBe(4000 + 2550 + 1200 + 3000);
    expect(s.count).toBe(4);
    expect(s.byTag.map((t) => [t.tag.name, t.cents])).toEqual([
      ['Courses', 6550],
      ['Loisirs', 3000],
      ['Transport', 1200],
    ]);
    expect(s.byTag.reduce((a, t) => a + t.share, 0)).toBeCloseTo(1);
  });

  it('un ou plusieurs tags choisis', () => {
    const d = sample();
    const one = summarize(d, { range: yearRange(2026), tagIds: new Set(['t1']) });
    expect(one.cents).toBe(1700);
    expect(one.byTag).toHaveLength(1);
    const two = summarize(d, { range: yearRange(2026), tagIds: new Set(['t0', 't1']) });
    expect(two.cents).toBe(4000 + 2550 + 999 + 1200 + 500);
    expect(two.byTag.map((t) => t.tag.id)).toEqual(['t0', 't1']);
  });

  it('un tag choisi sans dépense sur la période apparaît à 0 €', () => {
    const s = summarize(sample(), { range: monthRange(2026, 3), tagIds: new Set(['t2']) });
    expect(s.cents).toBe(0);
    expect(s.byTag).toEqual([{ tag: expect.objectContaining({ id: 't2' }), cents: 0, count: 0, share: 0 }]);
  });

  it('sans période : tout l’historique ; les bornes sont incluses', () => {
    const d = sample();
    expect(summarize(d, { range: { from: null, to: null }, tagIds: noTags }).count).toBe(6);
    expect(filterEntries(d.entries, { range: { from: '2026-03-15', to: '2026-04-01' }, tagIds: noTags }).map((e) => e.id).sort()).toEqual(['e2', 'e3', 'e4', 'e5']);
  });
});

describe('sauvegarde et validation', () => {
  it('export puis import : aller-retour exact', () => {
    const d = sample();
    expect(parseImport(exportData(d, 1))).toEqual(d);
  });

  it('refuse les fichiers qui ne sont pas à nous ou qui sont incohérents', () => {
    const d = sample();
    const file = (patch: object) => JSON.stringify({ ...JSON.parse(exportData(d, 1)), ...patch });
    expect(() => parseImport('pas du json')).toThrow(ImportError);
    expect(() => parseImport('{"app":"autre"}')).toThrow(ImportError);
    expect(() => parseImport(file({ entries: [{ ...d.entries[0], tagId: 'inconnu' }] }))).toThrow(ImportError);
    expect(() => parseImport(file({ entries: [{ ...d.entries[0], cents: 12.5 }] }))).toThrow(ImportError);
    expect(() => parseImport(file({ entries: [{ ...d.entries[0], cents: -5 }] }))).toThrow(ImportError);
    expect(() => parseImport(file({ entries: [{ ...d.entries[0], day: '2026-02-30' }] }))).toThrow(ImportError);
    expect(() => parseImport(file({ entries: [d.entries[0], d.entries[0]] }))).toThrow(ImportError);
    expect(() => parseImport(file({ tags: [d.tags[0], d.tags[0]] }))).toThrow(ImportError);
  });

  it('le stockage abîmé n’empêche jamais d’ouvrir l’app : on écarte seulement le mauvais', () => {
    const d = sample();
    expect(readData(null, false)).toEqual(EMPTY_DATA);
    expect(readData('n’importe quoi', false)).toEqual(EMPTY_DATA);
    expect(readData({ tags: 3, entries: {} }, false)).toEqual(EMPTY_DATA);
    const damaged = readData({ tags: d.tags, entries: [d.entries[0], { id: 'z', tagId: 't0', cents: 'beaucoup', day: '2026-01-01' }, { ...d.entries[1], tagId: 'fantôme' }] }, false);
    expect(damaged.entries.map((e) => e.id)).toEqual(['e1']);
  });
});
