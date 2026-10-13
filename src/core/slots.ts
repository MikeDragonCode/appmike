import { applyDayLog, dateToStr, isRestDay } from './bank';
import { addToLogs, emptyLog, getLog, rescoreLog } from './day';
import { REST_DAY_GLOW_DISCOUNT } from './scoring';
import { addMinutes, inQuietWindow, minutesOfDay, parseHM } from './time';
import { HabitItem, Slot, UserData } from './types';

// A slot counts as taken when at least this share of it was actually used.
export const COMPLETE_THRESHOLD = 0.8;
export const MIN_SLOT_MINS = 5;

export function glowCost(habit: HabitItem, amount: number, restDay: boolean): number {
  return amount * (habit.costRate ?? 0) * (restDay ? REST_DAY_GLOW_DISCOUNT : 1);
}

const isOpen = (s: Slot) => s.state === 'planned' || s.state === 'active';

export function reservedMins(data: UserData): number {
  return data.slots.filter(isOpen).reduce((sum, s) => sum + s.reservedCost, 0);
}

// What can still be planned: bank minus what booked slots already hold.
export function availableMins(data: UserData): number {
  return data.earnedTimeBank - reservedMins(data);
}

export function nextOpenSlot(data: UserData): Slot | null {
  const open = data.slots.filter(isOpen).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return open[0] ?? null;
}

export type BookError =
  | 'unknown_activity'
  | 'not_rest_activity'
  | 'too_short'
  | 'in_the_past'
  | 'past_bedtime'
  | 'over_limit';

export interface BookInput {
  id: string;
  habitId: string;
  plannedMins: number;
  startsAt: Date;
  now: Date;
}

export type BookResult =
  | { ok: true; data: UserData; slot: Slot }
  | { ok: false; error: BookError; shortBy?: number };

export function bookSlot(data: UserData, input: BookInput): BookResult {
  const habit = data.habits.find((h) => h.id === input.habitId);
  if (!habit) return { ok: false, error: 'unknown_activity' };
  if (habit.type !== 'glow' || habit.valueType !== 'duration') return { ok: false, error: 'not_rest_activity' };
  if (input.plannedMins < MIN_SLOT_MINS) return { ok: false, error: 'too_short' };
  // "Now" is allowed: a minute of slack for the time it takes to tap confirm.
  if (input.startsAt.getTime() < input.now.getTime() - 60_000) return { ok: false, error: 'in_the_past' };

  const end = addMinutes(input.startsAt, input.plannedMins);
  if (data.profile.hardBedtime) {
    const bed = parseHM(data.profile.bedtime);
    // A slot may end exactly at bedtime, so test its last minute.
    const lastMinute = addMinutes(end, -1);
    if (inQuietWindow(minutesOfDay(input.startsAt), bed) || inQuietWindow(minutesOfDay(lastMinute), bed)) {
      return { ok: false, error: 'past_bedtime' };
    }
  }

  const cost = glowCost(habit, input.plannedMins, isRestDay(data, input.startsAt));
  const room = availableMins(data) + data.profile.advanceCapMins;
  if (cost > room) return { ok: false, error: 'over_limit', shortBy: Math.ceil(cost - room) };

  const slot: Slot = {
    id: input.id,
    habitId: habit.id,
    plannedMins: input.plannedMins,
    startsAt: input.startsAt.toISOString(),
    state: 'planned',
    reservedCost: cost,
  };
  return { ok: true, data: { ...data, slots: [...data.slots, slot] }, slot };
}

export function startSlot(data: UserData, slotId: string, now: Date): UserData {
  return {
    ...data,
    slots: data.slots.map((s) =>
      s.id === slotId && s.state === 'planned' ? { ...s, state: 'active', startedAt: now.toISOString() } : s,
    ),
  };
}

export function setSlotNotification(data: UserData, slotId: string, notificationId: string | undefined): UserData {
  return { ...data, slots: data.slots.map((s) => (s.id === slotId ? { ...s, notificationId } : s)) };
}

export interface FinishOutcome {
  state: 'done' | 'partial' | 'skipped';
  planned: number;
  actual: number;
  charged: number; // bank minutes actually spent
  returned: number; // reserved minutes that went back to the bank
  message: string;
}

function outcomeMessage(state: FinishOutcome['state'], planned: number, actual: number, returned: number): string {
  if (state === 'done') return `Rest taken: ${actual} min. Well spent.`;
  if (state === 'partial') return `Used ${actual} of ${planned} min. The rest went back to your bank.`;
  return `Skipped. ${Math.round(returned)} min are back in your bank.`;
}

// Closes a slot with the minutes actually used. The reservation is released and
// only the used time is spent. Returns null if the slot is unknown or already closed.
export function finishSlot(
  data: UserData,
  slotId: string,
  actualMins: number,
  now: Date,
): { data: UserData; outcome: FinishOutcome } | null {
  const slot = data.slots.find((s) => s.id === slotId);
  const habit = slot && data.habits.find((h) => h.id === slot.habitId);
  if (!slot || !habit || !isOpen(slot)) return null;

  const actual = Math.max(0, Math.round(actualMins));
  const state: FinishOutcome['state'] =
    actual === 0 ? 'skipped' : actual >= Math.ceil(slot.plannedMins * COMPLETE_THRESHOLD) ? 'done' : 'partial';

  let next = data;
  if (actual > 0) {
    const date = dateToStr(now);
    const base = getLog(data, date) ?? emptyLog(date);
    const log = rescoreLog(data, { ...base, glowLogs: addToLogs(base.glowLogs, habit.id, actual) }, now);
    next = applyDayLog(data, log);
  }

  const charged = glowCost(habit, actual, isRestDay(data, now));
  const returned = Math.max(0, slot.reservedCost - charged);
  next = {
    ...next,
    slots: next.slots.map((s) =>
      s.id === slotId
        ? { ...s, state, actualMins: actual, reservedCost: 0, finishedAt: now.toISOString(), notificationId: undefined }
        : s,
    ),
  };
  return {
    data: next,
    outcome: { state, planned: slot.plannedMins, actual, charged, returned, message: outcomeMessage(state, slot.plannedMins, actual, returned) },
  };
}

export const skipSlot = (data: UserData, slotId: string, now: Date) => finishSlot(data, slotId, 0, now);

// Completed rest slots in the last 7 days (today included) - the weekly goal.
export function doneSlotsLast7(data: UserData, today: Date): number {
  const from = new Date(today);
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  return data.slots.filter((s) => s.state === 'done' && s.finishedAt && new Date(s.finishedAt) >= from).length;
}
