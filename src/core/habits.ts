import { HabitItem, UserData } from './types';

export const MIN_ACTIVE_PER_KIND = 1;
export const MAX_NAME_LENGTH = 30;

export const activeHabits = (data: UserData, type?: HabitItem['type']): HabitItem[] =>
  data.habits.filter((h) => !h.archived && (type ? h.type === type : true));

function nextCustomId(data: UserData, type: HabitItem['type']): string {
  const prefix = type === 'grind' ? 'cg_' : 'cl_';
  const used = data.habits
    .filter((h) => h.id.startsWith(prefix))
    .map((h) => Number(h.id.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  return `${prefix}${(used.length ? Math.max(...used) : 0) + 1}`;
}

export type HabitError = 'empty_name' | 'duplicate_name' | 'unknown' | 'last_of_kind';

export type HabitResult = { ok: true; data: UserData; id?: string } | { ok: false; error: HabitError };

const norm = (s: string) => s.trim().toLowerCase();

// Adds a timed activity. Work earns at the user's base rate, rest costs one bank minute per minute.
export function addCustomHabit(
  data: UserData,
  input: { type: HabitItem['type']; name: string; emoji?: string },
): HabitResult {
  const name = input.name.trim().slice(0, MAX_NAME_LENGTH);
  if (!name) return { ok: false, error: 'empty_name' };
  if (activeHabits(data, input.type).some((h) => norm(h.name) === norm(name))) {
    return { ok: false, error: 'duplicate_name' };
  }
  const id = nextCustomId(data, input.type);
  const habit: HabitItem =
    input.type === 'grind'
      ? { id, name, emoji: input.emoji?.trim() || '🔥', type: 'grind', valueType: 'duration', earnRate: data.profile.restPerHour / 60 }
      : { id, name, emoji: input.emoji?.trim() || '✨', type: 'glow', valueType: 'duration', costRate: 1 };
  return { ok: true, data: { ...data, habits: [...data.habits, habit] }, id };
}

// Hides an activity. History keeps resolving it; at least one of each kind must stay.
export function archiveHabit(data: UserData, id: string): HabitResult {
  const habit = data.habits.find((h) => h.id === id && !h.archived);
  if (!habit) return { ok: false, error: 'unknown' };
  if (activeHabits(data, habit.type).length <= MIN_ACTIVE_PER_KIND) return { ok: false, error: 'last_of_kind' };
  return { ok: true, data: { ...data, habits: data.habits.map((h) => (h.id === id ? { ...h, archived: true } : h)) } };
}

// Sets how much an activity is worth: rest minutes earned per hour (work, timed),
// per completion (work, counter) or bank minutes spent per hour of rest (rest).
export function setHabitWorth(data: UserData, id: string, perUnit: number): HabitResult {
  const habit = data.habits.find((h) => h.id === id && !h.archived);
  if (!habit) return { ok: false, error: 'unknown' };
  const v = Math.max(0, perUnit);
  let patch: Partial<HabitItem>;
  if (habit.type === 'glow') patch = { costRate: v / 60 };
  else if (habit.valueType === 'duration') patch = { earnRate: v / 60 };
  else patch = { earnRate: v };
  return { ok: true, data: { ...data, habits: data.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) } };
}

// The same worth in the units the user sees (see setHabitWorth).
export function habitWorth(habit: HabitItem): number {
  if (habit.type === 'glow') return (habit.costRate ?? 0) * 60;
  return habit.valueType === 'duration' ? (habit.earnRate ?? 0) * 60 : (habit.earnRate ?? 0);
}
