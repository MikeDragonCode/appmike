import {
  BookError,
  FinishOutcome,
  Slot,
  ExtendResult,
  bookSlot,
  extendSlot,
  finishSlot,
  logGrind,
  logRest,
  rescheduleSlot,
  undoLog,
  addWorkHours,
  removeWorkHours,
  startSlot,
  addMinutes,
} from '@/core';
import {
  cancelFocusEnd,
  cancelSlotNotifications,
  ensurePermission,
  scheduleFocusEnd,
  scheduleSlotEnd,
  scheduleSlotStart,
} from '@/services/notifications';
import { Focus, getState, setFocus, updateData } from './store';

// Everything that changes data AND has side effects (reminders, timers)
// lives here, so screens stay thin and core stays pure.

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const BOOK_ERRORS: Record<BookError | 'not_active' | 'not_planned', (shortBy?: number, bedtime?: string) => string> = {
  not_active: () => 'This rest is not running.',
  not_planned: () => 'This rest can no longer be moved.',
  unknown_activity: () => 'That activity no longer exists.',
  not_rest_activity: () => 'Pick a timed rest activity.',
  too_short: () => 'Rest slots start at 5 minutes.',
  in_the_past: () => 'That time has already passed.',
  past_bedtime: (_s, bedtime) => `Your bedtime rule: rest has to end by ${bedtime}.`,
  over_limit: (shortBy) => `That is ${shortBy} min more than you have. Work a bit first, or pick a shorter slot.`,
};

// Books a slot. "Now" slots start right away; later ones get a reminder.
export async function book(input: {
  habitId: string;
  plannedMins: number;
  startsAt: Date | null; // null = now
}): Promise<{ ok: true; slot: Slot; startedNow: boolean } | { ok: false; error: BookError; shortBy?: number }> {
  const data = getState().data;
  if (!data) return { ok: false, error: 'unknown_activity' };
  const now = new Date();
  const startsAt = input.startsAt ?? now;
  const r = bookSlot(data, { id: newId('s'), habitId: input.habitId, plannedMins: input.plannedMins, startsAt, now });
  if (!r.ok) return r;
  updateData(() => r.data);
  const habit = data.habits.find((h) => h.id === input.habitId);
  if (input.startsAt === null) {
    await beginSlot(r.slot.id);
    return { ok: true, slot: r.slot, startedNow: true };
  }
  if (habit && (await ensurePermission())) await scheduleSlotStart(r.slot, habit.name);
  return { ok: true, slot: r.slot, startedNow: false };
}

export async function beginSlot(slotId: string): Promise<void> {
  const data = getState().data;
  const slot = data?.slots.find((s) => s.id === slotId);
  if (!data || !slot || slot.state !== 'planned') return;
  const now = new Date();
  updateData((d) => startSlot(d, slotId, now));
  const habit = data.habits.find((h) => h.id === slot.habitId);
  await cancelSlotNotifications(slotId);
  if (habit && (await ensurePermission())) {
    await scheduleSlotEnd(slot, habit.name, addMinutes(now, slot.plannedMins));
  }
}

// Closes a slot with the minutes really used (0 = skipped).
export async function endSlot(slotId: string, actualMins: number): Promise<FinishOutcome | null> {
  const data = getState().data;
  if (!data) return null;
  const r = finishSlot(data, slotId, actualMins, new Date());
  if (!r) return null;
  updateData(() => r.data);
  await cancelSlotNotifications(slotId);
  return r.outcome;
}

export async function startFocus(habitId: string, goalMins?: number): Promise<void> {
  const started = new Date();
  const f: Focus = { habitId, startedAt: started.toISOString(), ...(goalMins ? { goalMins } : {}) };
  setFocus(f);
  if (!goalMins) return;
  const habit = getState().data?.habits.find((h) => h.id === habitId);
  // The permission prompt appears only now, when the person has asked for a goal.
  if (habit && (await ensurePermission())) await scheduleFocusEnd(habit.name, addMinutes(started, goalMins));
}

// Ends the running focus, however it ended: finished, stopped, discarded or replaced by a restore.
export async function endFocus(): Promise<void> {
  setFocus(null);
  await cancelFocusEnd();
}

// Logs work time. Returns the rest minutes earned, or null if nothing was logged.
// A timed session also feeds the hour-by-hour rhythm; a typed-in entry does not say when it happened.
let lastTimed: { habitId: string; minutes: number; endedAt: Date } | null = null;

export function logWork(habitId: string, minutes: number, timed = false): number | null {
  const data = getState().data;
  if (!data || !(minutes > 0)) return null;
  const now = new Date();
  const r = logGrind(data, habitId, minutes, now);
  if (!r) return null;
  updateData(() => (timed ? addWorkHours(r.data, now, minutes) : r.data));
  lastTimed = timed ? { habitId, minutes, endedAt: now } : null;
  return r.earned;
}

// Adds time to a running rest slot and moves its end reminder.
export async function extendRunningSlot(slotId: string, extraMins: number): Promise<ExtendResult> {
  const data = getState().data;
  if (!data) return { ok: false, error: 'not_active' };
  const r = extendSlot(data, slotId, extraMins);
  if (!r.ok) return r;
  updateData(() => r.data);
  const slot = r.data.slots.find((x) => x.id === slotId);
  const habit = slot && r.data.habits.find((h) => h.id === slot.habitId);
  if (slot?.startedAt && habit && (await ensurePermission())) {
    await scheduleSlotEnd(slot, habit.name, addMinutes(new Date(slot.startedAt), slot.plannedMins));
  }
  return r;
}

// Logs rest that already happened. Returns the bank minutes it cost, or null.
export function logRestNow(habitId: string, minutes: number): number | null {
  const data = getState().data;
  if (!data) return null;
  const r = logRest(data, habitId, minutes, new Date());
  if (!r) return null;
  updateData(() => r.data);
  return r.charged;
}

// Takes back a log entry made today. Returns false if it is no longer there.
export function undo(kind: 'work' | 'rest', habitId: string, amount: number): boolean {
  const data = getState().data;
  if (!data) return false;
  const next = undoLog(data, kind, habitId, amount, new Date());
  if (!next) return false;
  const t = lastTimed;
  const takeBack = kind === 'work' && t && t.habitId === habitId && t.minutes === amount;
  updateData(() => (takeBack ? removeWorkHours(next, t.endedAt, amount) : next));
  if (takeBack) lastTimed = null;
  return true;
}

// Moves a booked slot to a new time and moves its start reminder with it.
export async function moveSlot(slotId: string, startsAt: Date) {
  const data = getState().data;
  if (!data) return { ok: false as const, error: 'not_planned' as const };
  const r = rescheduleSlot(data, slotId, startsAt, new Date());
  if (!r.ok) return r;
  updateData(() => r.data);
  const habit = r.data.habits.find((h) => h.id === r.slot.habitId);
  await cancelSlotNotifications(slotId);
  if (habit && (await ensurePermission())) await scheduleSlotStart(r.slot, habit.name);
  return r;
}
