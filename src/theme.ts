import { Platform } from 'react-native';

// Design tokens. Every color is taken from the reference pictures (pale grey-white, orange, red-orange, amber), plus black ink
// and white for text. Soft orange and amber orbs float behind the screens; a deep red-orange "hero" card carries the one thing
// that matters on each screen. Nothing else.
// scripts/make-images.py draws the icon, the orbs, the hero gradient and the status bar fade from these colors; run it after changing them.
export const colors = {
  bg: '#e5e5e0', // the pale grey-white of the references
  surface: '#f4f4f0', // cards: a lighter step of the same grey-white
  surfaceHigh: 'rgba(235, 113, 46, 0.14)',
  border: 'rgba(28, 20, 16, 0.14)',
  text: '#1c1410',
  muted: '#5f5a55',
  grind: '#eb712e', // work: orange
  grindText: '#b3241a', // a darker red-orange, for small text on the pale wall
  glow: '#f0b846', // rest: sunny amber
  good: '#f0b846',
  goodText: '#7d5208',
  danger: '#b3241a',
  onAccent: '#1c1410', // text on orange and amber fills
  heroText: '#ffffff', // text on the deep orange hero card
  heroMuted: 'rgba(255, 255, 255, 0.92)',
  heroLine: 'rgba(255, 255, 255, 0.2)',
  heroButtonText: '#b3241a',
} as const;

export const radius = { sm: 10, md: 20, pill: 9999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

// Large figures and titles are set in a serif, which is what gives the screens their editorial, unhurried feel.
export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }) as string,
};
