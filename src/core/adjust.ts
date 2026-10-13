import { applyDayLog, dateToStr, isRestDay } from './bank';
import { addToLogs, emptyLog, getLog, rescoreLog } from './day';
import { BookError, MIN_SLOT_MINS, availableMins, glowCost } from './slots';
import { addMinutes, inQuietWindow, minutesOfDay, parseHM } from './time';
import { ItemLog, UserData } from './types';

// ---- Rest that already happened ----

// Logs rest the person already took without booking it. It is spent from the bank
// as it happened: reality is recorded, not refused. The bank may go below zero,
// and the next work pays it back.
export function logRest(
  data: UserData,
  habitId: string,
  minutes: number,
  now: Date,
): { data: UserData; charged: number } | null {
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit || habit.type !== 'glow' || habit.valueType !== 'duration' || !(minutes > 0)) return null;
  const date = dateToStr(now);
  const base = getLog(data, date) ?? emptyLog(date);
  const log = rescoreLog(data, { ...base, glowLogs: addToLogs(base.glowLogs, habit.id, minutes) }, now);
  return { data: applyDayLog(data, log), charged: glowCost(habit, minutes, isRestDay(data, now)) };
}

// ---- Undo ----

function removeFromLogs(logs: ItemLog[], habitId: string, amount: number): ItemLog[] | null {
  const found = logs.find((l) => l.habitId === habitId);
  if (!found || found.value < amount - 1e-9) return null;
  const left = found.value - amount;
  return left <= 1e-9
    ? logs.filter((l) => l.habitId !== habitId)
    : logs.map((l) => (l.habitId === habitId ? { ...l, value: left } : l));
}

// Takes back something logged today (a mistaken +1, a wrong manual entry).
// Returns null when today's log does not hold that much of it.
export function undoLog(data: UserData, kind: 'work' | 'rest', habitId: string, amount: number, now: Date): UserData | null {
  const date = dateToStr(now);
  const base = getLog(data, date);
  if (!base || !(amount > 0)) return null;
  const key = kind === 'work' ? 'grindLogs' : 'glowLogs';
  const next = removeFromLogs(base[key], habitId, amount);
  if (!next) return null;
  return applyDayLog(data, rescoreLog(data, { ...base, [key]: next }, now));
}

// ---- Extending a rest slot ----

export type ExtendResult =
  | { ok: true; data: UserData }
  | { ok: false; error: BookError | 'not_active'; shortBy?: number };

// Adds minutes to a slot that is running. Same rules as booking: the extra
// cost must fit in the bank plus the allowed advance, and a bedtime rule still holds.
export function extendSlot(data: UserData, slotId: string, extraMins: number): ExtendResult {
  const slot = data.slots.find((s) => s.id === slotId);
  if (!slot || slot.state !== 'active' || !slot.startedAt) return { ok: false, error: 'not_active' };
  if (extraMins < MIN_SLOT_MINS) return { ok: false, error: 'too_short' };
  const habit = data.habits.find((h) => h.id === slot.habitId);
  if (!habit) return { ok: false, error: 'unknown_activity' };

  const started = new Date(slot.startedAt);
  const newPlanned = slot.plannedMins + extraMins;
  if (data.profile.hardBedtime) {
    const bed = parseHM(data.profile.bedtime);
    const lastMinute = addMinutes(addMinutes(started, newPlanned), -1);
    if (inQuietWindow(minutesOfDay(lastMinute), bed)) return { ok: false, error: 'past_bedtime' };
  }

  const newCost = glowCost(habit, newPlanned, isRestDay(data, new Date(slot.startsAt)));
  const extraCost = newCost - slot.reservedCost;
  const room = availableMins(data) + data.profile.advanceCapMins;
  if (extraCost > room) return { ok: false, error: 'over_limit', shortBy: Math.ceil(extraCost - room) };

  return {
    ok: true,
    data: {
      ...data,
      slots: data.slots.map((s) => (s.id === slotId ? { ...s, plannedMins: newPlanned, reservedCost: newCost } : s)),
    },
  };
}
