// Design tokens. Light only: a summer morning, warm white walls, sun on the top of the screen, orange and sea green.
// Cards are a little white laid over the wall, so they read the same under the sun glow and away from it.
// scripts/make-images.py draws the icon, the sun glow and the status bar fade from these colors; run it after changing them.
export const colors = {
  bg: '#fff8ef',
  surface: 'rgba(255, 255, 255, 0.78)',
  surfaceHigh: 'rgba(240, 138, 36, 0.12)',
  border: 'rgba(120, 80, 40, 0.14)',
  text: '#2d2118',
  muted: '#7b6a58',
  grind: '#f08a24', // work: summer orange
  grindText: '#a85400', // the same orange, dark enough to read as text on the wall
  glow: '#5bb8a0', // rest: sea green
  good: '#6cc49a',
  goodText: '#2c7d56',
  danger: '#c7442e',
  onAccent: '#2d2118', // text on orange and green fills
} as const;

export const radius = { sm: 8, md: 16, pill: 9999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
