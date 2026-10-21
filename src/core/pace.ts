import { summarizeDay } from './summary';
import { UserData } from './types';
import { addDays, startOfWeek, weekStartOf } from './week';

// Enough to say something fair about a week.
export const PACE_MIN_EARNED = 90; // rest minutes earned so far this week
export const PACE_MIN_DAYS = 2; // days with any work or rest in them
export const UNUSED_BELOW = 0.4; // rest taken as a share of rest earned

export interface RestPace {
  kind: 'unused' | 'balanced';
  earned: number; // rest minutes earned this week so far
  spent: number; // rest minutes taken this week so far
}

// How this calendar week is going when rest is set against work: the app is about earning rest
// *and taking it*. Says something only when there is enough to go on, and only in two cases: a lot
// of rest left on the table, or work and rest in step. Borrowing ahead is the bank's own business.
export function restPace(data: UserData, today: Date): RestPace | null {
  const first = startOfWeek(today, weekStartOf(data));
  let earned = 0;
  let spent = 0;
  let days = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(first, i);
    if (d > today) break;
    const s = summarizeDay(data, d);
    earned += s.earned;
    spent += s.spent;
    if (s.workMins > 0 || s.restMins > 0 || s.earned > 0) days++;
  }
  if (days < PACE_MIN_DAYS || earned < PACE_MIN_EARNED) return null;
  const e = Math.round(earned);
  const sp = Math.round(spent);
  if (spent < earned * UNUSED_BELOW) return { kind: 'unused', earned: e, spent: sp };
  if (spent <= earned * 1.2) return { kind: 'balanced', earned: e, spent: sp };
  return null;
}
