import { View } from 'react-native';
import { sanitizeAmountInput } from '../domain/amount';
import { t } from '../i18n';
import { Text, TextInput } from './components';
import { useTheme } from './theme';

/** Champ de montant : gros chiffres, « € » à droite ; n'accepte que chiffres et une virgule. */
export function AmountInput({
  value,
  onChange,
  onSubmit,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, borderRadius: 14, paddingHorizontal: 16 }}>
      <TextInput
        accessibilityLabel={t('add.amount')}
        value={value}
        onChangeText={(v) => onChange(sanitizeAmountInput(v))}
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        keyboardType="decimal-pad"
        inputMode="decimal"
        returnKeyType="done"
        placeholder="0,00"
        maxLength={10}
        selectTextOnFocus
        style={{ flex: 1, fontSize: 30, fontWeight: '800', paddingVertical: 12, minWidth: 0 }}
      />
      <Text style={{ fontSize: 26, fontWeight: '700', color: theme.muted, marginLeft: 8 }}>€</Text>
    </View>
  );
}
