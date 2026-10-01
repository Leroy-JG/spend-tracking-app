import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatAmount } from '../domain/amount';
import { dayKey, parseKey } from '../domain/dates';
import type { Entry } from '../domain/types';
import { formatDate, formatMonth, t, tn } from '../i18n';
import { useStore } from '../store/store';
import { Card, Text } from './components';
import { EntryRow } from './EntryRow';
import { EntrySheet } from './EntrySheet';
import { MonthGrid } from './MonthGrid';
import { TabScreen } from './Screen';
import { useTheme } from './theme';

/** Calendrier : chaque jour avec dépenses porte des pastilles (couleurs des tags) ; toucher un jour liste ses dépenses. */
export function CalendarView() {
  const theme = useTheme();
  const store = useStore();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string>(dayKey(Date.now()));
  const [editing, setEditing] = useState<Entry | null>(null);

  const markers = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const [day, summary] of store.days) m.set(day, summary.tagIds.map((id) => store.tagById.get(id)?.color ?? theme.border));
    return m;
  }, [store.days, store.tagById, theme.border]);

  const monthTotal = useMemo(() => {
    let cents = 0;
    let count = 0;
    for (const [day, s] of store.days) {
      const { year, month0 } = parseKey(day);
      if (year === cursor.y && month0 === cursor.m) {
        cents += s.cents;
        count += s.count;
      }
    }
    return { cents, count };
  }, [store.days, cursor]);

  const dayEntries = useMemo(() => store.recent.filter((e) => e.day === selected), [store.recent, selected]);
  const day = store.days.get(selected);

  return (
    <TabScreen active="calendar" title={t('tab.calendar')}>
      <Card>
        <MonthGrid year={cursor.y} month={cursor.m} onChangeMonth={(y, m) => setCursor({ y, m })} selected={selected} onSelect={setSelected} markers={markers} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.muted, fontSize: 13 }} numberOfLines={1}>
            {t('calendar.monthTotal', { month: formatMonth(cursor.y, cursor.m).toLowerCase() })} · {tn('count.entry', monthTotal.count)}
          </Text>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>{formatAmount(monthTotal.cents)}</Text>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 24, marginBottom: 12 }}>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '800' }}>
          {formatDate(selected)}
        </Text>
        {day ? <Text style={{ fontWeight: '700', color: theme.muted }}>{formatAmount(day.cents)}</Text> : null}
      </View>
      {dayEntries.length === 0 ? <Text style={{ color: theme.muted }}>{t('calendar.nothing')}</Text> : null}
      {dayEntries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} tag={store.tagById.get(entry.tagId)} onPress={() => setEditing(entry)} />
      ))}

      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </TabScreen>
  );
}
