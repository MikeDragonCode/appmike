import { addMinutes } from './time';
import { UserData } from './types';

// Focus time by the hour of the day it happened, kept on the device so the app can say when
// the person tends to work best. Only timed sessions count: an entry typed in afterwards does
// not say when the work happened.
export const HOURS = 24;
export const RHYTHM_MIN_MINS = 300; // five hours of timed work before saying anything
export const WINDOW_HOURS = 3;

const empty = () => new Array<number>(HOURS).fill(0);

// Spreads a finished session over the hours it covered, counting back from when it ended.
function spread(data: UserData, endedAt: Date, minutes: number, sign: 1 | -1): UserData {
  const by = (data.workByHour ?? empty()).slice(0, HOURS);
  while (by.length < HOURS) by.push(0);
  const whole = Math.round(minutes);
  for (let i = 1; i <= whole; i++) {
    const h = addMinutes(endedAt, -i).getHours();
    by[h] = Math.max(0, by[h] + sign);
  }
  return { ...data, workByHour: by };
}

export const addWorkHours = (data: UserData, endedAt: Date, minutes: number) => spread(data, endedAt, minutes, 1);
export const removeWorkHours = (data: UserData, endedAt: Date, minutes: number) => spread(data, endedAt, minutes, -1);

export interface BestWindow {
  from: number; // first hour of the window, 0..23
  to: number; // hour it ends at, 1..24 (may be past midnight as to - 24)
  share: number; // 0..1 of all timed focus
}

// The run of hours that holds the most focus time. Null until there is enough to go on.
export function bestWindow(data: UserData): BestWindow | null {
  const by = data.workByHour;
  if (!by || by.length !== HOURS) return null;
  const total = by.reduce((a, b) => a + b, 0);
  if (total < RHYTHM_MIN_MINS) return null;
  let best = 0;
  let bestSum = -1;
  for (let s = 0; s < HOURS; s++) {
    let sum = 0;
    for (let k = 0; k < WINDOW_HOURS; k++) sum += by[(s + k) % HOURS];
    if (sum > bestSum) {
      bestSum = sum;
      best = s;
    }
  }
  return { from: best, to: (best + WINDOW_HOURS) % HOURS, share: bestSum / total };
}
