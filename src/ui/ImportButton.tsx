import { useState } from 'react';
import { ImportError, parseImport } from '../domain/exchange';
import type { Data } from '../domain/types';
import { t, tn } from '../i18n';
import { useStore } from '../store/store';
import { Button, ConfirmSheet, Text } from './components';
import { pickTextFile } from './files';
import { useTheme } from './theme';

/**
 * Importer un fichier de sauvegarde : choix du fichier, validation complète (accepté en entier ou refusé),
 * confirmation, puis remplacement des données. L'état actuel est gardé dans l'historique par le store.
 */
export function ImportButton({ title, variant = 'ghost' }: { title: string; variant?: 'solid' | 'ghost' }) {
  const theme = useTheme();
  const store = useStore();
  const [pending, setPending] = useState<Data | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const pick = async () => {
    setMessage(null);
    try {
      const content = await pickTextFile();
      if (content !== null) setPending(parseImport(content));
    } catch (e) {
      const text = e instanceof ImportError ? t(`import.${e.message}` as 'import.invalid_json') : t('settings.importFailed');
      setMessage({ text, error: true });
    }
  };

  return (
    <>
      <Button title={title} variant={variant} onPress={pick} />
      {message ? (
        <Text style={{ color: message.error ? theme.error : theme.success, marginTop: 12 }} accessibilityLiveRegion="polite">
          {message.text}
        </Text>
      ) : null}
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
          setMessage({ text: t('settings.imported') });
        }}
      />
    </>
  );
}
