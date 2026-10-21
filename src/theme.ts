// Design tokens. The whole app is four colors and nothing else: white, ink, orange and red. Everything lighter or softer is
// one of those at a lower opacity. Orange is the accent (work, rest, buttons), red is only the deep hero card and small warnings.
// scripts/make-images.py draws the icon, the orb, the hero gradient and the status bar fade from these colors; run it after changing them.
export const colors = {
  bg: '#ffffff',
  surface: '#ffffff', // cards: white with a thin ink line
  surfaceHigh: 'rgba(235, 113, 46, 0.12)', // orange, faint
  border: 'rgba(28, 20, 16, 0.12)',
  text: '#1c1410', // ink
  muted: 'rgba(28, 20, 16, 0.62)',
  grind: '#eb712e', // orange
  grindText: '#d12d20', // red, for small warnings
  glow: '#eb712e',
  good: '#eb712e',
  goodText: '#1c1410',
  danger: '#d12d20',
  onAccent: '#1c1410', // ink on orange
  heroText: '#ffffff', // on the red hero card
  heroMuted: 'rgba(255, 255, 255, 0.88)',
  heroLine: 'rgba(255, 255, 255, 0.2)',
  heroButtonText: '#d12d20',
} as const;

export const radius = { sm: 10, md: 20, pill: 9999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

// Type: Inter Tight (a tight grotesque) for everything, light for the big figures, and DM Mono for the small labels.
// The files live in assets/fonts and load in the root layout (see fontFiles). Both fonts are under the SIL Open Font License.
export const fonts = {
  light: 'InterTight_300Light',
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  mono: 'DMMono_400Regular',
} as const;

export const fontFiles = {
  [fonts.light]: require('../assets/fonts/InterTight_300Light.ttf'),
  [fonts.regular]: require('../assets/fonts/InterTight_400Regular.ttf'),
  [fonts.medium]: require('../assets/fonts/InterTight_500Medium.ttf'),
  [fonts.mono]: require('../assets/fonts/DMMono_400Regular.ttf'),
};
