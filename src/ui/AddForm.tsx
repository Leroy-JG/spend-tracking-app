import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { parseAmount } from '../domain/amount';
import { MAX_NOTE } from '../domain/types';
import { dayLabel, t } from '../i18n';
import { today, useStore } from '../store/store';
import { AmountInput } from './AmountInput';
import { Button, Card, Chip, Field, TagChip, Text } from './components';
import { DateSheet } from './DateSheet';
import { TagSheet } from './TagSheet';
import { useTheme } from './theme';

/** Formulaire d'ajout : tag, montant, note facultative, date (aujourd'hui par défaut). */
export function AddForm() {
  const theme = useTheme();
  const store = useStore();
  const [tagId, setTagId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  /** `null` = aujourd'hui (calculé à l'ajout : l'app peut rester ouverte passé minuit). */
  const [day, setDay] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const tag = tagId ? (store.tagById.get(tagId) ?? null) : null; // le tag choisi a pu être supprimé entre-temps
  const cents = parseAmount(amount);
  const canAdd = !!tag && cents !== null;

  const submit = () => {
    if (!tag || cents === null) return;
    store.addEntry({ tagId: tag.id, cents, note, day: day ?? today() });
    setAmount('');
    setNote('');
    setDay(null);
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 2500);
  };

  return (
    <Card>
      <Text style={{ fontSize: 17, fontWeight: '800', marginBottom: 12 }}>{t('add.title')}</Text>

      <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 8, fontWeight: '600' }}>{t('add.tag')}</Text>
      {store.data.tags.length === 0 ? (
        <Text style={{ color: theme.muted, lineHeight: 20, marginBottom: 10 }}>{t('add.noTags')}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {store.data.tags.map((tg) => (
          <TagChip key={tg.id} tag={tg} selected={tg.id === tag?.id} onPress={() => setTagId(tg.id)} />
        ))}
        <Chip label={t('add.newTag')} icon="add" onPress={() => setTagOpen(true)} />
      </View>

      <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>{t('add.amount')}</Text>
      <View style={{ marginBottom: 14 }}>
        <AmountInput value={amount} onChange={setAmount} onSubmit={submit} />
      </View>

      <Field label={t('add.note')} value={note} onChangeText={setNote} maxLength={MAX_NOTE} placeholder={t('add.notePlaceholder')} returnKeyType="done" />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title={day ? dayLabel(day) : t('day.today')} icon="calendar-outline" variant="ghost" onPress={() => setDateOpen(true)} />
        <Button title={t('add.submit')} icon="add" disabled={!canAdd} onPress={submit} style={{ flex: 1 }} />
      </View>
      <View accessibilityLiveRegion="polite" style={{ minHeight: 22, marginTop: 10 }}>
        {added ? <Text style={{ color: theme.success, fontWeight: '600' }}>{t('add.done')}</Text> : null}
      </View>

      <DateSheet visible={dateOpen} value={day ?? today()} onPick={setDay} onClose={() => setDateOpen(false)} />
      <TagSheet visible={tagOpen} tag={null} onClose={() => setTagOpen(false)} onSaved={(created) => setTagId(created.id)} />
    </Card>
  );
}
