import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { exportData } from '../domain/exchange';
import { exportFileName } from '../domain/backupFile';
import type { Tag } from '../domain/types';
import { t, tn } from '../i18n';
import { useStore } from '../store/store';
import { Button, Card, ConfirmSheet, Text } from './components';
import { shareText } from './files';
import { ImportButton } from './ImportButton';
import { periodLabel } from './BackupsView';
import { TabScreen } from './Screen';
import { TagSheet } from './TagSheet';
import { useTheme } from './theme';

export function SettingsView() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const [tagSheet, setTagSheet] = useState<{ tag: Tag | null } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);

  const counts = new Map<string, number>();
  for (const e of store.data.entries) counts.set(e.tagId, (counts.get(e.tagId) ?? 0) + 1);

  const doExport = async () => {
    const at = Date.now();
    try {
      const shared = await shareText(exportFileName(at), exportData(store.data, at));
      if (shared) setMessage(t('settings.exported'));
    } catch {
      setMessage(t('settings.exportFailed'));
    }
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
      <Pressable
        onPress={() => router.push('/backups')}
        accessibilityRole="button"
        accessibilityLabel={t('settings.backups')}
        style={{ marginTop: 12 }}
      >
        <Card style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
          <Ionicons name="save-outline" size={22} color={theme.action} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 15 }}>{t('settings.backups')}</Text>
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
              {store.settings.autoBackup.enabled
                ? t('settings.backupsSummary', { period: periodLabel(store.settings.autoBackup), count: tn('autobackup.count', store.backups.length) })
                : `${t('settings.backupsOff')} · ${tn('autobackup.count', store.backups.length)}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.muted} />
        </Card>
      </Pressable>
      <Card style={{ marginTop: 12 }}>
        <Text style={{ color: theme.muted, lineHeight: 20, marginBottom: 14 }}>{t('settings.dataHelp')}</Text>
        <View style={{ gap: 10 }}>
          <Button title={t('settings.export')} onPress={doExport} />
          <ImportButton title={t('settings.import')} />
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
