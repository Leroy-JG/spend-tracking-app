import type { ReactNode } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../i18n';
import { useStore } from '../store/store';
import { BottomBar, Text, type TabKey } from './components';
import { KeyboardScrollView } from './keyboard';
import { useTheme } from './theme';

/** Distance (px) du bas à partir de laquelle on charge la suite de la liste. */
const NEAR_END = 700;

/** Écran de premier niveau : en-tête, contenu défilant (qui garde le champ actif visible), barre du bas. */
export function TabScreen({
  active,
  title,
  onNearEnd,
  children,
}: {
  active: TabKey;
  title: string;
  /** Appelée quand on approche du bas de la liste (une fois par longueur de contenu : pas de rafale). */
  onNearEnd?: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const firedAt = useRef(-1);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onNearEnd) return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentSize.height - (contentOffset.y + layoutMeasurement.height) > NEAR_END) return;
    if (firedAt.current === contentSize.height) return;
    firedAt.current = contentSize.height;
    onNearEnd();
  };

  if (!store.ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderColor: theme.border,
          minHeight: 56 + insets.top,
        }}
      >
        <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '800' }}>
          {title}
        </Text>
      </View>
      {store.saveFailed ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.card, borderBottomWidth: 1, borderColor: theme.error }}>
          <Text accessibilityLiveRegion="polite" style={{ color: theme.error, fontSize: 13, fontWeight: '600', lineHeight: 18 }}>
            {t('banner.saveFailed')}
          </Text>
        </View>
      ) : null}
      <KeyboardScrollView
        onScroll={onScroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 24, width: '100%', maxWidth: 720, alignSelf: 'center' }}
      >
        {children}
      </KeyboardScrollView>
      <BottomBar active={active} />
    </View>
  );
}
