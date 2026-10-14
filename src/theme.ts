// Design tokens. Dark only: a warm evening room, lamp light on a wall, linen and sage.
// Cards and chips are a little light laid over the wall, so they read the same under the lamp glow and away from it.
// scripts/make-images.py draws the icon and the lamp glow from these colors; run it after changing them.
export const colors = {
  bg: '#2a231d',
  surface: 'rgba(255, 238, 214, 0.075)',
  surfaceHigh: 'rgba(255, 238, 214, 0.13)',
  border: 'rgba(255, 238, 214, 0.16)',
  text: '#f8f0e3',
  muted: '#c2b5a3',
  grind: '#f0b266', // work: lamp amber
  glow: '#b4c9a2', // rest: sage
  good: '#c2d49b',
  danger: '#ee8b78',
  onAccent: '#2a231d',
} as const;

export const radius = { sm: 8, md: 16, pill: 9999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
