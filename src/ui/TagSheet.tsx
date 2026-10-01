import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { tagNameError } from '../domain/mutations';
import { MAX_TAG_NAME, type Tag } from '../domain/types';
import { t, tn } from '../i18n';
import { useStore } from '../store/store';
import { Button, ConfirmSheet, Field, Sheet, Text } from './components';
import { KeyboardScrollView } from './keyboard';
import { TAG_COLORS, onColor, useTheme } from './theme';

/** Première couleur de la palette pas encore utilisée par un tag (sinon on recommence au début). */
function suggestColor(tags: readonly Tag[]): string {
  const used = new Set(tags.map((tag) => tag.color.toUpperCase()));
  return (TAG_COLORS.find((c) => !used.has(c.hex.toUpperCase())) ?? TAG_COLORS[tags.length % TAG_COLORS.length]!).hex;
}

/** Création (`tag` = null) ou modification d'un tag : nom, couleur, et suppression. */
export function TagSheet({
  visible,
  tag,
  onClose,
  onSaved,
}: {
  visible: boolean;
  tag: Tag | null;
  onClose: () => void;
  /** Appelé après une création ou une modification (la feuille se ferme ensuite). */
  onSaved?: (tag: Tag) => void;
}) {
  const theme = useTheme();
  const store = useStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TAG_COLORS[0].hex);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(tag?.name ?? '');
    setColor(tag?.color ?? suggestColor(store.data.tags));
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on repart de zéro à chaque ouverture seulement
  }, [visible, tag?.id]);

  const error = tagNameError(store.data, name, tag?.id);
  const entryCount = tag ? store.data.entries.filter((e) => e.tagId === tag.id).length : 0;

  const save = () => {
    if (error) return;
    if (tag) {
      store.updateTag(tag.id, { name, color });
      onSaved?.({ ...tag, name: name.trim(), color });
    } else {
      onSaved?.(store.addTag(name, color));
    }
    onClose();
  };

  return (
    <>
      <Sheet visible={visible} title={tag ? t('tag.edit') : t('tag.new')} onClose={onClose}>
        <KeyboardScrollView style={{ flexGrow: 0 }}>
          <Field
            label={t('tag.name')}
            value={name}
            onChangeText={setName}
            onSubmitEditing={save}
            placeholder={t('tag.namePlaceholder')}
            maxLength={MAX_TAG_NAME}
            autoFocus={!tag}
            returnKeyType="done"
          />
          {error === 'duplicate' ? (
            <Text style={{ color: theme.error, marginTop: -8, marginBottom: 12 }} accessibilityLiveRegion="polite">
              {t('tag.errDuplicate')}
            </Text>
          ) : null}

          <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 8, fontWeight: '600' }}>{t('tag.color')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
            {TAG_COLORS.map((c) => {
              const selected = c.hex.toUpperCase() === color.toUpperCase();
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setColor(c.hex)}
                  accessibilityRole="button"
                  accessibilityLabel={c.key}
                  accessibilityState={{ selected }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: c.hex,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: selected ? theme.text : 'transparent',
                  }}
                >
                  {selected ? <Ionicons name="checkmark" size={20} color={onColor(c.hex)} /> : null}
                </Pressable>
              );
            })}
          </View>

          <Button title={tag ? t('common.save') : t('common.create')} disabled={!!error} onPress={save} />
          {tag ? <Button title={t('tag.delete')} variant="danger" style={{ marginTop: 10 }} onPress={() => setConfirmDelete(true)} /> : null}
        </KeyboardScrollView>
      </Sheet>

      <ConfirmSheet
        visible={confirmDelete && !!tag}
        title={t('tag.deleteTitle')}
        message={entryCount === 0 ? t('tag.deleteEmpty', { name: tag?.name ?? '' }) : tn('tag.deleteWith', entryCount, { name: tag?.name ?? '' })}
        confirmLabel={t('common.delete')}
        danger
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (tag) store.deleteTag(tag.id);
          setConfirmDelete(false);
          onClose();
        }}
      />
    </>
  );
}
