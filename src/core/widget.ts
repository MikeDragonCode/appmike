import { availableMins, nextOpenSlot } from './slots';
import { UserData } from './types';

// What a home screen widget or a Live Activity needs to know, and nothing else.
// Plain numbers and strings, so it can cross into the native side as it is.
export interface WidgetSnapshot {
  availMins: number; // rest the person can book right now, whole minutes, may be below zero
  next: { title: string; startsAt: number } | null; // the next booked rest, epoch ms
  focus: { name: string; startedAt: number; goalMins: number } | null; // a running focus block, goalMins 0 = none
}

export interface RunningFocus {
  habitId: string;
  startedAt: string;
  goalMins?: number;
}

export function widgetSnapshot(data: UserData, focus?: RunningFocus | null): WidgetSnapshot {
  const slot = nextOpenSlot(data);
  const slotHabit = slot ? data.habits.find((h) => h.id === slot.habitId) : undefined;
  const focusHabit = focus ? data.habits.find((h) => h.id === focus.habitId) : undefined;
  return {
    availMins: Math.floor(availableMins(data)),
    next: slot && slotHabit ? { title: `${slotHabit.emoji} ${slotHabit.name}`, startsAt: new Date(slot.startsAt).getTime() } : null,
    focus: focus && focusHabit ? { name: `${focusHabit.emoji} ${focusHabit.name}`, startedAt: new Date(focus.startedAt).getTime(), goalMins: focus.goalMins ?? 0 } : null,
  };
}

// Two snapshots that would draw the same thing, so the widget is not redrawn for nothing.
export function sameSnapshot(a: WidgetSnapshot, b: WidgetSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
