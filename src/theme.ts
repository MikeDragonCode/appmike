import { Platform } from 'react-native';

// Design tokens. Light only: near-white walls, white cards, one saturated orange, soft orange orbs floating behind the
// screens, and a deep orange "hero" surface for the one thing that matters on each screen. Rest is a pale apricot.
// scripts/make-images.py draws the icon, the orbs, the hero gradient and the status bar fade from these colors; run it after changing them.
export const colors = {
  bg: '#fbf8f5',
  surface: 'rgba(255, 255, 255, 0.92)',
  surfaceHigh: 'rgba(232, 112, 42, 0.09)',
  border: 'rgba(60, 36, 24, 0.10)',
  text: '#241915',
  muted: '#7a6a60',
  grind: '#e8702a', // work: orange
  grindText: '#b83f12', // the same orange, dark enough to read as text on white
  glow: '#f2ab80', // rest: pale apricot
  good: '#f2ab80',
  goodText: '#a14416',
  danger: '#b83a22',
  onAccent: '#241915', // text on orange and apricot fills
  heroText: '#ffffff', // text on the deep orange hero card
  heroMuted: 'rgba(255, 255, 255, 0.9)',
  heroLine: 'rgba(255, 255, 255, 0.2)',
  heroButtonText: '#a93614',
} as const;

export const radius = { sm: 10, md: 20, pill: 9999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

// Large figures and titles are set in a serif, which is what gives the screens their editorial, unhurried feel.
export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }) as string,
};
