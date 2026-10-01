import { Pressable, View } from 'react-native';
import { dayKey, shiftMonth, toKey } from '../domain/dates';
import { formatMonth, weekdayLetters } from '../i18n';
import { IconButton, Text } from './components';
import { useTheme } from './theme';

const MAX_DOTS = 3;

/** Grille d'un mois (lundi en premier), avec une pastille de la couleur de chaque tag dépensé ce jour-là. */
export function MonthGrid({
  year,
  month,
  onChangeMonth,
  selected,
  onSelect,
  markers,
}: {
  year: number;
  month: number; // 0-11
  onChangeMonth: (year: number, month: number) => void;
  selected: string | null;
  onSelect: (key: string) => void;
  /** Jour → couleurs des tags dépensés ce jour-là. */
  markers?: Map<string, string[]>;
}) {
  const theme = useTheme();
  const today = dayKey(Date.now());
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    const next = shiftMonth(year, month, delta);
    onChangeMonth(next.year, next.month0);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <IconButton name="chevron-back" onPress={() => shift(-1)} label="‹" />
        <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 17 }}>{formatMonth(year, month)}</Text>
        <IconButton name="chevron-forward" onPress={() => shift(1)} label="›" />
      </View>
      <View style={{ flexDirection: 'row' }}>
        {weekdayLetters().map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: theme.muted, fontSize: 12, fontWeight: '600', paddingBottom: 6 }}>
            {w}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row' }}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (day === null) return <View key={col} style={{ flex: 1, height: 46 }} />;
            const key = toKey(year, month, day);
            const isSel = key === selected;
            const dots = markers?.get(key)?.slice(0, MAX_DOTS) ?? [];
            return (
              <Pressable
                key={col}
                onPress={() => onSelect(key)}
                accessibilityRole="button"
                accessibilityLabel={key}
                accessibilityState={{ selected: isSel }}
                style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSel ? theme.action : 'transparent',
                    borderWidth: key === today && !isSel ? 1.5 : 0,
                    borderColor: theme.action,
                  }}
                >
                  <Text style={{ color: isSel ? theme.onAction : theme.text, fontWeight: key === today ? '800' : '500', fontSize: 14 }}>{day}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 3, height: 5, marginTop: 1 }}>
                  {dots.map((color, i) => (
                    <View key={i} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
