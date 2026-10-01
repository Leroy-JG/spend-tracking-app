import { Pressable, View } from 'react-native';
import { formatAmount } from '../domain/amount';
import type { Entry, Tag } from '../domain/types';
import { Card, Text } from './components';
import { useTheme } from './theme';

/** Une dépense, en carte : tag (couleur à gauche), note, montant. Toucher la carte l'ouvre pour la modifier. */
export function EntryRow({ entry, tag, onPress }: { entry: Entry; tag: Tag | undefined; onPress: () => void }) {
  const theme = useTheme();
  const amount = formatAmount(entry.cents);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tag?.name ?? ''}, ${amount}${entry.note ? `, ${entry.note}` : ''}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: 10 })}
    >
      <Card accent={tag?.color ?? theme.border} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontWeight: '700', fontSize: 16 }} numberOfLines={1}>
            {tag?.name ?? '—'}
          </Text>
          {entry.note ? (
            <Text style={{ color: theme.muted, fontSize: 13, marginTop: 3, lineHeight: 18 }} numberOfLines={2}>
              {entry.note}
            </Text>
          ) : null}
        </View>
        <Text style={{ fontWeight: '800', fontSize: 17 }}>{amount}</Text>
      </Card>
    </Pressable>
  );
}
