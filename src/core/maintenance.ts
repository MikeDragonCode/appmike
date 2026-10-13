import { finishSlot } from './slots';
import { addMinutes } from './time';
import { Slot, UserData } from './types';

// A booked slot that was never started stops holding rest this long after it ended.
export const PLANNED_GRACE_MINS = 30;
// A started slot nobody finished is closed this long after its planned end.
export const ACTIVE_GRACE_MINS = 60;

export interface ExpireResult {
  data: UserData;
  expired: Slot[]; // the slots that were closed, as they were before
}

// Cleans up slots the user walked away from, so reserved rest cannot be stuck forever.
// - never started, long past its end: skipped, the reservation goes back to the bank
// - started, long past its end: counted as taken in full (the timer was running)
// Returns the same data object when nothing changed.
export function expireSlots(data: UserData, now: Date): ExpireResult {
  let next = data;
  const expired: Slot[] = [];
  for (const slot of data.slots) {
    if (slot.state === 'planned') {
      const over = addMinutes(new Date(slot.startsAt), slot.plannedMins + PLANNED_GRACE_MINS);
      if (over.getTime() <= now.getTime()) {
        const r = finishSlot(next, slot.id, 0, now);
        if (r) {
          next = r.data;
          expired.push(slot);
        }
      }
    } else if (slot.state === 'active' && slot.startedAt) {
      const over = addMinutes(new Date(slot.startedAt), slot.plannedMins + ACTIVE_GRACE_MINS);
      if (over.getTime() <= now.getTime()) {
        const r = finishSlot(next, slot.id, slot.plannedMins, now);
        if (r) {
          next = r.data;
          expired.push(slot);
        }
      }
    }
  }
  return { data: next, expired };
}
