import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatAmount } from '../domain/amount';
import type { Entry } from '../domain/types';
import { dayLabel, t } from '../i18n';
import { useStore } from '../store/store';
import { AddForm } from './AddForm';
import { Button, Text } from './components';
import { EntryRow } from './EntryRow';
import { EntrySheet } from './EntrySheet';
import { TabScreen } from './Screen';
import { useTheme } from './theme';

const PAGE = 30;

/** Accueil : le formulaire d'ajout en haut, puis l'historique récent qui défile et se charge au fil du scroll. */
export function HomeView() {
  const theme = useTheme();
  const store = useStore();
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<Entry | null>(null);

  const more = store.recent.length > limit;

  // Les dépenses du même jour se suivent : un en-tête (jour + total du jour) à chaque changement de jour.
  const rows = useMemo(() => {
    const out: ({ kind: 'day'; day: string } | { kind: 'entry'; entry: Entry })[] = [];
    let last = '';
    for (const entry of store.recent.slice(0, limit)) {
      if (entry.day !== last) {
        out.push({ kind: 'day', day: entry.day });
        last = entry.day;
      }
      out.push({ kind: 'entry', entry });
    }
    return out;
  }, [store.recent, limit]);

  return (
    <TabScreen active="home" title={t('app.name')} onNearEnd={() => setLimit((l) => l + PAGE)}>
      <AddForm />

      <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '800', marginTop: 26, marginBottom: 12 }}>
        {t('recent.title')}
      </Text>
      {store.recent.length === 0 ? <Text style={{ color: theme.muted, lineHeight: 20 }}>{t('recent.empty')}</Text> : null}
      {rows.map((row) =>
        row.kind === 'day' ? (
          <View key={`d${row.day}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, marginBottom: 8, paddingHorizontal: 4 }}>
            <Text style={{ fontWeight: '700', fontSize: 14, color: theme.muted }}>{dayLabel(row.day)}</Text>
            <Text style={{ fontWeight: '600', fontSize: 13, color: theme.muted }}>{formatAmount(store.days.get(row.day)?.cents ?? 0)}</Text>
          </View>
        ) : (
          <EntryRow key={row.entry.id} entry={row.entry} tag={store.tagById.get(row.entry.tagId)} onPress={() => setEditing(row.entry)} />
        ),
      )}
      {more ? <Button title={t('recent.more')} variant="ghost" onPress={() => setLimit((l) => l + PAGE)} style={{ marginTop: 6 }} /> : null}

      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </TabScreen>
  );
}
