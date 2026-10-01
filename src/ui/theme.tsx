import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { FAMILY, PALETTE, PIGMENTS, contrast, type Palette } from '../brand';

/** Couleurs proposées pour les tags : les 12 pigments de la famille. */
export const TAG_COLORS = [
  { key: 'kermes', hex: PIGMENTS.kermes },
  { key: 'cornaline', hex: PIGMENTS.cornaline },
  { key: 'orpiment', hex: PIGMENTS.orpiment },
  { key: 'olive', hex: PIGMENTS.olive },
  { key: 'turquoise', hex: PIGMENTS.turquoise },
  { key: 'ciel', hex: PIGMENTS.ciel },
  { key: 'lapis', hex: PIGMENTS.lapis },
  { key: 'indigo', hex: PIGMENTS.indigo },
  { key: 'pourpre', hex: PIGMENTS.pourpre },
  { key: 'rose-damas', hex: PIGMENTS.roseDamas },
  { key: 'henne', hex: PIGMENTS.henne },
  { key: 'pierre', hex: PIGMENTS.pierre },
] as const;

export interface Theme {
  dark: boolean;
  bg: string;
  card: string;
  text: string;
  /** Texte secondaire (contraste ≥ 4,5:1 sur le fond). */
  muted: string;
  border: string;
  track: string;
  /** Boutons principaux et éléments actifs. */
  action: string;
  onAction: string;
  /** Remplissage des barres. */
  bar: string;
  success: string;
  error: string;
  accent: string;
}

export function themeFor(p: Palette, dark: boolean): Theme {
  if (dark) {
    return {
      dark,
      bg: p.night,
      card: p.card,
      text: FAMILY.cream,
      muted: FAMILY.muted.dark,
      border: p.border,
      track: p.track,
      action: FAMILY.accent, // le fond de marque est trop sombre sur la nuit : l'or porte l'action
      onAction: FAMILY.warmBlack,
      bar: p.secondary,
      success: FAMILY.success.dark,
      error: FAMILY.error.dark,
      accent: FAMILY.accentWarm,
    };
  }
  return {
    dark,
    bg: FAMILY.cream,
    card: FAMILY.light.card,
    text: FAMILY.warmBlack,
    muted: FAMILY.muted.light,
    border: FAMILY.light.border,
    track: FAMILY.light.track,
    action: p.ground,
    onAction: '#FFFFFF',
    bar: p.ground,
    success: FAMILY.success.light,
    error: FAMILY.error.light,
    accent: FAMILY.accent,
  };
}

const ThemeContext = createContext<Theme>(themeFor(PALETTE, false));

/** Thème clair / sombre : suit le téléphone. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo(() => themeFor(PALETTE, scheme === 'dark'), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** Couleur de texte lisible posée sur `background`. */
export function onColor(background: string): string {
  return contrast(background, '#FFFFFF') >= contrast(background, FAMILY.warmBlack) ? '#FFFFFF' : FAMILY.warmBlack;
}

/** Couleur du tag utilisable comme texte sur `background` ; sinon le texte normal du thème. */
export function readableAccent(color: string, theme: Theme): string {
  return contrast(color, theme.bg) >= 3 ? color : theme.text;
}
