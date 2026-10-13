import { dateToStr } from './bank';
import { summarizeDay } from './summary';
import { UserData } from './types';

export const RECAP_EVERY_DAYS = 7;

export interface Recap {
  from: string; // first day covered, YYYY-MM-DD
  to: string; // last day covered (yesterday)
  workMins: number;
  restMins: number;
  earned: number;
  restSlots: number; // rest slots taken (done)
  goodDays: number; // days with a score above 20
  slotGoal: number; // 0 = no goal
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);

// A look back at the last 7 full days, offered once a week. Only when the app has
// been in use that long and the week had something in it. Never shown twice for the same week.
export function weeklyRecap(data: UserData, today: Date): Recap | null {
  const since = data.lastRecapDate ? new Date(`${data.lastRecapDate}T12:00:00`) : new Date(data.createdAt);
  if (daysBetween(since, today) < RECAP_EVERY_DAYS) return null;

  let workMins = 0;
  let restMins = 0;
  let earned = 0;
  let goodDays = 0;
  let from = '';
  let to = '';
  for (let i = RECAP_EVERY_DAYS; i >= 1; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12);
    const s = summarizeDay(data, d);
    workMins += s.workMins;
    restMins += s.restMins;
    earned += s.earned;
    if (s.score > 20) goodDays++;
    if (i === RECAP_EVERY_DAYS) from = dateToStr(d);
    if (i === 1) to = dateToStr(d);
  }
  const windowStart = new Date(`${from}T00:00:00`);
  const windowEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const restSlots = data.slots.filter((s) => {
    if (s.state !== 'done' || !s.finishedAt) return false;
    const t = new Date(s.finishedAt);
    return t >= windowStart && t < windowEnd;
  }).length;

  if (workMins === 0 && restMins === 0 && restSlots === 0) return null;
  return { from, to, workMins, restMins, earned, restSlots, goodDays, slotGoal: data.profile.weeklySlotGoal };
}

// Marks the recap as seen, so the next one comes a week later.
export function dismissRecap(data: UserData, today: Date): UserData {
  return { ...data, lastRecapDate: dateToStr(today) };
}
