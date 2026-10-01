import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ImportError, exportData, parseImport } from '../domain/exchange';
import { dayKey } from '../domain/dates';
import type { Data, Tag } from '../domain/types';
import { t, tn } from '../i18n';
import { useStore } from '../store/store';
import { Button, Card, ConfirmSheet, Field, Sheet, Text } from './components';
import { canPickFile, pickTextFile, shareText } from './files';
import { KeyboardScrollView } from './keyboard';
import { TabScreen } from './Screen';
import { TagSheet } from './TagSheet';
import { useTheme } from './theme';

export function SettingsView() {
  const theme = useTheme();
  const store = useStore();
  const [tagSheet, setTagSheet] = useState<{ tag: Tag | null } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Data | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);

  const counts = new Map<string, number>();
  for (const e of store.data.entries) counts.set(e.tagId, (counts.get(e.tagId) ?? 0) + 1);

  const doExport = async () => {
    const at = Date.now();
    try {
      const shared = await shareText(`sakk-sauvegarde-${dayKey(at)}.json`, exportData(store.data, at));
      if (shared) setMessage(t('settings.exported'));
    } catch {
      setMessage(t('settings.exportFailed'));
    }
  };

  const tryParse = (source: string) => {
    try {
      setPending(parseImport(source));
      setError(null);
    } catch (e) {
      setError(e instanceof ImportError ? t(`import.${e.message}` as 'import.invalid_json') : t('import.invalid_format'));
    }
  };

  const pickFile = async () => {
    const content = await pickTextFile();
    if (content !== null) tryParse(content);
  };

  return (
    <TabScreen active="settings" title={t('tab.settings')}>
      <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '800', marginBottom: 10 }}>
        {t('settings.tags')}
      </Text>
      <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        {store.data.tags.length === 0 ? <Text style={{ color: theme.muted, lineHeight: 20, paddingVertical: 12 }}>{t('settings.tagsEmpty')}</Text> : null}
        {store.data.tags.map((tag, i) => (
          <Pressable
            key={tag.id}
            onPress={() => setTagSheet({ tag })}
            accessibilityRole="button"
            accessibilityLabel={`${t('tag.edit')} ${tag.name}`}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderColor: theme.border }}
          >
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: tag.color, marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                {tag.name}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{tn('count.entry', counts.get(tag.id) ?? 0)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.muted} />
          </Pressable>
        ))}
      </Card>
      <Button title={t('add.newTag')} icon="add" variant="ghost" style={{ marginTop: 12 }} onPress={() => setTagSheet({ tag: null })} />

      <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '800', marginTop: 28, marginBottom: 10 }}>
        {t('settings.data')}
      </Text>
      <Card>
        <Text style={{ fontWeight: '800', fontSize: 15, marginBottom: 8 }}>{t('privacy.headline')}</Text>
        <Text style={{ color: theme.muted, lineHeight: 20 }}>{t('privacy.text')}</Text>
      </Card>
      <Card style={{ marginTop: 12 }}>
        <Text style={{ color: theme.muted, lineHeight: 20, marginBottom: 14 }}>{t('settings.dataHelp')}</Text>
        <View style={{ gap: 10 }}>
          <Button title={t('settings.export')} onPress={doExport} />
          <Button
            title={t('settings.import')}
            variant="ghost"
            onPress={() => {
              setText('');
              setError(null);
              setImportOpen(true);
            }}
          />
        </View>
        {message ? (
          <Text style={{ color: theme.success, marginTop: 12 }} accessibilityLiveRegion="polite">
            {message}
          </Text>
        ) : null}
      </Card>
      <Card style={{ marginTop: 12 }}>
        <Text style={{ color: theme.muted, lineHeight: 20, marginBottom: 14 }}>{t('settings.eraseHelp')}</Text>
        <Button title={t('settings.erase')} variant="danger" onPress={() => setEraseOpen(true)} />
      </Card>

      <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 28 }}>
        {t('app.name')} {Constants.expoConfig?.version ?? ''} · {t('settings.about')}
      </Text>

      <TagSheet visible={tagSheet !== null} tag={tagSheet?.tag ?? null} onClose={() => setTagSheet(null)} />

      <Sheet visible={importOpen && !pending} title={t('settings.import')} onClose={() => setImportOpen(false)}>
        <KeyboardScrollView style={{ flexGrow: 0 }}>
          {canPickFile ? <Button title={t('settings.pickFile')} variant="ghost" onPress={pickFile} style={{ marginBottom: 14 }} /> : null}
          <Field
            label={t('settings.pasteLabel')}
            value={text}
            onChangeText={(v) => {
              setText(v);
              setError(null);
            }}
            multiline
            style={{ minHeight: 120, textAlignVertical: 'top' }}
            placeholder="{ ... }"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {error ? (
            <Text style={{ color: theme.error, marginBottom: 10 }} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button title={t('settings.importCheck')} disabled={text.trim() === ''} onPress={() => tryParse(text)} />
        </KeyboardScrollView>
      </Sheet>

      <ConfirmSheet
        visible={!!pending}
        title={t('settings.importConfirmTitle')}
        message={t('settings.importConfirmText', {
          tags: tn('count.tag', pending?.tags.length ?? 0),
          entries: tn('count.entry', pending?.entries.length ?? 0),
        })}
        confirmLabel={t('settings.importConfirm')}
        danger
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) store.replaceAll(pending);
          setPending(null);
          setImportOpen(false);
          setMessage(t('settings.imported'));
        }}
      />

      <ConfirmSheet
        visible={eraseOpen}
        title={t('settings.eraseTitle')}
        message={t('settings.eraseText')}
        confirmLabel={t('settings.eraseConfirm')}
        danger
        onClose={() => setEraseOpen(false)}
        onConfirm={() => {
          store.eraseAll();
          setEraseOpen(false);
          setMessage(t('settings.erased'));
        }}
      />
    </TabScreen>
  );
}
