import { addMinutes } from './time';
import { Recharge, UserData } from './types';

// After a rest the person can say, in one tap, whether it recharged them. It is only ever a note for them:
// it never changes the bank, and nothing is asked twice. Later it shows which rests tend to do them good.
export function rateSlot(data: UserData, slotId: string, recharge: Recharge): UserData | null {
  const slot = data.slots.find((s) => s.id === slotId);
  if (!slot || (slot.state !== 'done' && slot.state !== 'partial')) return null;
  return { ...data, slots: data.slots.map((s) => (s.id === slotId ? { ...s, recharge } : s)) };
}

export interface RestInsight {
  rated: number; // rests rated in the last 30 days
  recharged: number; // of those, how many said "Yes"
  best?: { name: string; recharged: number; rated: number }; // the rest that recharges most, with at least 2 ratings
}

const WINDOW_DAYS = 30;
const MIN_RATED = 5;

export function restInsight(data: UserData, now: Date): RestInsight | null {
  const since = addMinutes(now, -WINDOW_DAYS * 24 * 60).getTime();
  const rated = data.slots.filter((s) => s.recharge !== undefined && new Date(s.startsAt).getTime() >= since);
  if (rated.length < MIN_RATED) return null;
  const recharged = rated.filter((s) => s.recharge === 2).length;

  const byHabit = new Map<string, { rated: number; recharged: number }>();
  for (const s of rated) {
    const e = byHabit.get(s.habitId) ?? { rated: 0, recharged: 0 };
    e.rated += 1;
    if (s.recharge === 2) e.recharged += 1;
    byHabit.set(s.habitId, e);
  }
  let best: RestInsight['best'];
  let bestShare = 0;
  for (const [habitId, e] of byHabit) {
    const habit = data.habits.find((h) => h.id === habitId);
    const share = e.recharged / e.rated;
    // Only a real lead counts: a clear majority, and more than the others.
    if (habit && e.rated >= 2 && share > 0.5 && share > bestShare) {
      best = { name: habit.name, recharged: e.recharged, rated: e.rated };
      bestShare = share;
    }
  }
  return { rated: rated.length, recharged, best };
}
