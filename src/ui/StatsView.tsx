import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatAmount } from '../domain/amount';
import { dayKey, monthRange, shiftMonth, yearRange, type Range } from '../domain/dates';
import { summarize } from '../domain/stats';
import { formatDate, formatMonth, t, tn } from '../i18n';
import { useStore } from '../store/store';
import { Bar, Button, Card, Chip, IconButton, Segmented, TagChip, Text } from './components';
import { DateSheet } from './DateSheet';
import { TabScreen } from './Screen';
import { useTheme } from './theme';

type Mode = 'month' | 'year' | 'custom' | 'all';

/** Suivi : combien dépensé sur une période, pour un ou plusieurs tags (aucun choisi = tous). */
export function StatsView() {
  const theme = useTheme();
  const store = useStore();
  const now = new Date();
  const [mode, setMode] = useState<Mode>('month');
  const [month, setMonth] = useState({ year: now.getFullYear(), month0: now.getMonth() });
  const [year, setYear] = useState(now.getFullYear());
  const [custom, setCustom] = useState(() => ({ from: monthRange(now.getFullYear(), now.getMonth()).from!, to: dayKey(Date.now()) }));
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());

  const range: Range =
    mode === 'month' ? monthRange(month.year, month.month0) : mode === 'year' ? yearRange(year) : mode === 'custom' ? custom : { from: null, to: null };

  // Un tag supprimé depuis la dernière sélection ne doit plus filtrer (sinon tout afficherait 0).
  const tagIds = useMemo(() => new Set([...picked].filter((id) => store.tagById.has(id))), [picked, store.tagById]);
  const summary = useMemo(() => summarize(store.data, { range, tagIds }), [store.data, range.from, range.to, tagIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => {
    const next = new Set(tagIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPicked(next);
  };

  const pickDay = (which: 'from' | 'to', day: string) => {
    // Les deux bornes restent dans l'ordre : choisir un début après la fin (ou l'inverse) ramène l'autre borne au même jour.
    setCustom((c) => (which === 'from' ? { from: day, to: c.to < day ? day : c.to } : { from: c.from > day ? day : c.from, to: day }));
  };

  return (
    <TabScreen active="stats" title={t('tab.stats')}>
      <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>{t('stats.period')}</Text>
      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'month', label: t('stats.month') },
          { value: 'year', label: t('stats.year') },
          { value: 'custom', label: t('stats.custom') },
          { value: 'all', label: t('stats.all') },
        ]}
      />

      <View style={{ marginTop: 10, minHeight: 44, justifyContent: 'center' }}>
        {mode === 'month' ? (
          <Stepper
            label={formatMonth(month.year, month.month0)}
            onPrev={() => setMonth((m) => shiftMonth(m.year, m.month0, -1))}
            onNext={() => setMonth((m) => shiftMonth(m.year, m.month0, 1))}
          />
        ) : null}
        {mode === 'year' ? <Stepper label={String(year)} onPrev={() => setYear((y) => y - 1)} onNext={() => setYear((y) => y + 1)} /> : null}
        {mode === 'custom' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={`${t('stats.from')} ${formatDate(custom.from)}`} variant="ghost" style={{ flex: 1, paddingHorizontal: 8 }} onPress={() => setPicking('from')} />
            <Button title={`${t('stats.to')} ${formatDate(custom.to)}`} variant="ghost" style={{ flex: 1, paddingHorizontal: 8 }} onPress={() => setPicking('to')} />
          </View>
        ) : null}
        {mode === 'all' ? <Text style={{ color: theme.muted, textAlign: 'center' }}>{t('stats.allHelp')}</Text> : null}
      </View>

      <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600', marginTop: 18, marginBottom: 8 }}>{t('stats.tags')}</Text>
      {store.data.tags.length === 0 ? (
        <Text style={{ color: theme.muted, lineHeight: 20 }}>{t('stats.noTags')}</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label={t('stats.allTags')} selected={tagIds.size === 0} onPress={() => setPicked(new Set())} />
          {store.data.tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} selected={tagIds.has(tag.id)} onPress={() => toggle(tag.id)} />
          ))}
        </View>
      )}

      <Card style={{ marginTop: 22 }}>
        <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600' }}>{t('stats.total')}</Text>
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 36, fontWeight: '800', marginTop: 2 }}>
          {formatAmount(summary.cents)}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>{tn('count.entry', summary.count)}</Text>

        {summary.byTag.length > 0 ? (
          <View style={{ marginTop: 18, paddingTop: 6, borderTopWidth: 1, borderColor: theme.border }}>
            {summary.byTag.map((row) => (
              <View key={row.tag.id} style={{ marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: row.tag.color, marginRight: 8 }} />
                  <Text style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>
                    {row.tag.name}
                  </Text>
                  <Text style={{ fontWeight: '700' }}>{formatAmount(row.cents)}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12, width: 44, textAlign: 'right' }}>{Math.round(row.share * 100)} %</Text>
                </View>
                <Bar value={row.share} color={row.tag.color} />
              </View>
            ))}
          </View>
        ) : null}
        {summary.count === 0 && store.data.tags.length > 0 ? <Text style={{ color: theme.muted, marginTop: 14 }}>{t('stats.empty')}</Text> : null}
      </Card>

      <DateSheet
        visible={picking !== null}
        title={picking === 'to' ? t('stats.to') : t('stats.from')}
        value={picking === 'to' ? custom.to : custom.from}
        onPick={(day) => picking && pickDay(picking, day)}
        onClose={() => setPicking(null)}
      />
    </TabScreen>
  );
}

function Stepper({ label, onPrev, onNext }: { label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <IconButton name="chevron-back" onPress={onPrev} label={t('stats.prev')} />
      <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 17 }}>{label}</Text>
      <IconButton name="chevron-forward" onPress={onNext} label={t('stats.next')} />
    </View>
  );
}
