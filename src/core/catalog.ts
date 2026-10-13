import { HabitItem } from './types';

// Starter activities. Grind rates are derived from the user's "rest per hour"
// setting (weight 1 = the base rate); glow cost rates are fixed.
export interface CatalogItem {
  id: string;
  name: string;
  emoji: string;
  type: 'grind' | 'glow';
  valueType: 'duration' | 'counter';
  weight?: number; // grind duration: multiplier of the base rate
  counterMins?: number; // grind counter: rest minutes per completion at the base rate
  costRate?: number; // glow
  window?: HabitItem['window'];
}

export const GRIND_CATALOG: CatalogItem[] = [
  { id: 'g1', name: 'Deep Work', emoji: '💻', type: 'grind', valueType: 'duration', weight: 1 },
  { id: 'g2', name: 'Workout', emoji: '🏋️', type: 'grind', valueType: 'duration', weight: 1.5 },
  { id: 'g4', name: 'Study / Reading', emoji: '📚', type: 'grind', valueType: 'duration', weight: 1 },
  { id: 'g8', name: 'Run / Cardio', emoji: '🏃', type: 'grind', valueType: 'duration', weight: 1.5 },
  { id: 'g6', name: 'Side Project', emoji: '🚀', type: 'grind', valueType: 'duration', weight: 0.66 },
  { id: 'g5', name: 'Clean House', emoji: '🧹', type: 'grind', valueType: 'duration', weight: 1 },
  { id: 'g10', name: 'Admin / Emails', emoji: '📧', type: 'grind', valueType: 'duration', weight: 0.5 },
  { id: 'g7', name: 'Meditation', emoji: '🧘', type: 'grind', valueType: 'duration', weight: 0.3 },
  { id: 'g3', name: 'Cook / Chores', emoji: '🍳', type: 'grind', valueType: 'counter', counterMins: 15 },
  { id: 'g9', name: 'Grocery Shopping', emoji: '🛒', type: 'grind', valueType: 'counter', counterMins: 20 },
];

export const GLOW_CATALOG: CatalogItem[] = [
  { id: 'gl1', name: 'PS5 / Gaming', emoji: '🎮', type: 'glow', valueType: 'duration', costRate: 1, window: 'evening' },
  { id: 'gl2', name: 'Netflix / TV', emoji: '🍿', type: 'glow', valueType: 'duration', costRate: 1, window: 'evening' },
  { id: 'gl5', name: 'Hangout with Friends', emoji: '🍻', type: 'glow', valueType: 'duration', costRate: 0.5, window: 'evening' },
  { id: 'gl6', name: 'Nap', emoji: '😴', type: 'glow', valueType: 'duration', costRate: 0.8, window: 'day' },
  { id: 'gl9', name: 'Listening to Music', emoji: '🎧', type: 'glow', valueType: 'duration', costRate: 0.2 },
  { id: 'gl10', name: 'Doing Absolutely Nothing', emoji: '🦥', type: 'glow', valueType: 'duration', costRate: 1 },
  { id: 'gl4', name: 'YouTube Rabbit Hole', emoji: '📺', type: 'glow', valueType: 'duration', costRate: 1.2 },
  { id: 'gl3', name: 'Doomscrolling', emoji: '📱', type: 'glow', valueType: 'duration', costRate: 1.5 },
];

export const DEFAULT_GRIND_IDS = ['g1', 'g2', 'g4'];
export const DEFAULT_GLOW_IDS = ['gl1', 'gl2', 'gl5'];

export interface CustomActivity {
  name: string;
  emoji: string;
}

export interface Selection {
  grindIds: string[];
  glowIds: string[];
  customGrind: CustomActivity[];
  customGlow: CustomActivity[];
}

// Turn the picked catalog items (plus custom ones) into the user's habits.
export function materializeHabits(sel: Selection, restPerHour: number): HabitItem[] {
  const habits: HabitItem[] = [];
  for (const item of GRIND_CATALOG.filter((i) => sel.grindIds.includes(i.id))) {
    habits.push({
      id: item.id,
      name: item.name,
      emoji: item.emoji,
      type: 'grind',
      valueType: item.valueType,
      earnRate:
        item.valueType === 'duration'
          ? (restPerHour / 60) * (item.weight ?? 1)
          : (item.counterMins ?? 15) * (restPerHour / 30),
    });
  }
  for (const item of GLOW_CATALOG.filter((i) => sel.glowIds.includes(i.id))) {
    habits.push({
      id: item.id,
      name: item.name,
      emoji: item.emoji,
      type: 'glow',
      valueType: 'duration',
      costRate: item.costRate,
      window: item.window,
    });
  }
  sel.customGrind.forEach((c, i) =>
    habits.push({
      id: `cg_${i + 1}`,
      name: c.name.trim(),
      emoji: c.emoji || '🔥',
      type: 'grind',
      valueType: 'duration',
      earnRate: restPerHour / 60,
    }),
  );
  sel.customGlow.forEach((c, i) =>
    habits.push({
      id: `cl_${i + 1}`,
      name: c.name.trim(),
      emoji: c.emoji || '✨',
      type: 'glow',
      valueType: 'duration',
      costRate: 1,
    }),
  );
  return habits;
}
