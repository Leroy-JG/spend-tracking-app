import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { amountToInput, formatAmount, parseAmount } from '../domain/amount';
import { MAX_NOTE, type Entry } from '../domain/types';
import { dayLabel, formatDate, t } from '../i18n';
import { useStore } from '../store/store';
import { AmountInput } from './AmountInput';
import { Button, ConfirmSheet, Field, Sheet, Text, TagChip } from './components';
import { DateSheet } from './DateSheet';
import { KeyboardScrollView } from './keyboard';
import { useTheme } from './theme';

/** Modification ou suppression d'une dépense (`entry` = null : fermée). */
export function EntrySheet({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const theme = useTheme();
  const store = useStore();
  // Pendant l'animation de fermeture `entry` est déjà null : on garde la dernière pour ne pas vider la feuille.
  const shown = useRef(entry);
  if (entry) shown.current = entry;
  const current = shown.current;

  const [tagId, setTagId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [day, setDay] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setTagId(entry.tagId);
    setAmount(amountToInput(entry.cents));
    setNote(entry.note);
    setDay(entry.day);
    setDateOpen(false);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on repart des valeurs de la dépense à chaque ouverture seulement
  }, [entry?.id]);

  const cents = parseAmount(amount);
  const canSave = cents !== null && store.tagById.has(tagId) && day !== '';

  const save = () => {
    if (!current || cents === null || !canSave) return;
    store.updateEntry(current.id, { tagId, cents, note, day });
    onClose();
  };

  return (
    <>
      <Sheet visible={!!entry} title={t('entry.edit')} onClose={onClose}>
        <KeyboardScrollView style={{ flexGrow: 0 }}>
          <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 8, fontWeight: '600' }}>{t('add.tag')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {store.data.tags.map((tag) => (
              <TagChip key={tag.id} tag={tag} selected={tag.id === tagId} onPress={() => setTagId(tag.id)} />
            ))}
          </View>

          <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>{t('add.amount')}</Text>
          <View style={{ marginBottom: 14 }}>
            <AmountInput value={amount} onChange={setAmount} onSubmit={save} />
          </View>

          <Field label={t('add.note')} value={note} onChangeText={setNote} maxLength={MAX_NOTE} placeholder={t('add.notePlaceholder')} returnKeyType="done" />

          <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 6, fontWeight: '600' }}>{t('add.date')}</Text>
          <View style={{ flexDirection: 'row', marginBottom: 18 }}>
            <Button title={day ? dayLabel(day) : ''} icon="calendar-outline" variant="ghost" onPress={() => setDateOpen(true)} />
          </View>

          <Button title={t('common.save')} disabled={!canSave} onPress={save} />
          <Button title={t('entry.delete')} variant="danger" style={{ marginTop: 10 }} onPress={() => setConfirmDelete(true)} />
        </KeyboardScrollView>
      </Sheet>

      <DateSheet visible={dateOpen} value={day || current?.day || '2000-01-01'} onPick={setDay} onClose={() => setDateOpen(false)} />

      <ConfirmSheet
        visible={confirmDelete && !!entry}
        title={t('entry.deleteTitle')}
        message={t('entry.deleteText', {
          tag: current ? (store.tagById.get(current.tagId)?.name ?? '—') : '',
          amount: current ? formatAmount(current.cents) : '',
          date: current ? formatDate(current.day) : '',
        })}
        confirmLabel={t('common.delete')}
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (current) store.deleteEntry(current.id);
          setConfirmDelete(false);
          onClose();
        }}
      />
    </>
  );
}
