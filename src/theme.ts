// Design tokens. Dark only: a warm evening room, lamp light on linen and wood.
export const colors = {
  bg: '#1b1713',
  surface: '#251f1a',
  surfaceHigh: '#312a23',
  border: '#3a3229',
  text: '#f4ece0',
  muted: '#a89d8d',
  grind: '#e3a05a', // work: lamp amber
  glow: '#a9c09a', // rest: sage
  good: '#b8c98f',
  danger: '#e8806f',
  onAccent: '#1b1713',
} as const;

export const radius = { sm: 8, md: 16, pill: 9999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
