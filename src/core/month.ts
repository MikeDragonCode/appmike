import { dateToStr } from './bank';
import { summarizeDay } from './summary';
import { addMinutes } from './time';
import { UserData } from './types';

// The last 30 days in plain numbers: what was worked, what was rested, how many booked rests were taken.
// Shown as a quiet look back once there are a week's worth of days to look back on. It never compares or scores.
export interface MonthSummary {
  workMins: number;
  restMins: number;
  restsTaken: number;
  activeDays: number;
}

const DAYS = 30;
const MIN_ACTIVE_DAYS = 7;

export function monthSummary(data: UserData, now: Date): MonthSummary | null {
  let workMins = 0;
  let restMins = 0;
  let activeDays = 0;
  for (let i = 0; i < DAYS; i++) {
    const d = addMinutes(now, -i * 24 * 60);
    const log = data.logs.find((l) => l.date === dateToStr(d));
    if (!log) continue;
    const s = summarizeDay(data, d);
    workMins += s.workMins;
    restMins += s.restMins;
    if (s.workMins > 0 || s.restMins > 0) activeDays += 1;
  }
  if (activeDays < MIN_ACTIVE_DAYS || restMins <= 0) return null;
  const since = addMinutes(now, -DAYS * 24 * 60).getTime();
  const restsTaken = data.slots.filter((s) => (s.state === 'done' || s.state === 'partial') && new Date(s.startsAt).getTime() >= since).length;
  return { workMins, restMins, restsTaken, activeDays };
}
