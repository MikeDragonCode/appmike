import { dateToStr } from './bank';
import { summarizeDay } from './summary';
import { UserData } from './types';
import { addDays, startOfWeek, weekStartOf } from './week';

// A recap needs at least this many days of use inside the week it covers.
export const RECAP_MIN_DAYS = 3;

export interface Recap {
  from: string; // first day of the week covered, YYYY-MM-DD
  to: string; // last day of the week covered
  workMins: number;
  restMins: number;
  earned: number;
  restSlots: number; // rest slots taken (done)
  goodDays: number; // days with a score above 20
  slotGoal: number; // 0 = no goal
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);

// A look back at the calendar week that has just ended, offered once, from the first day
// of the new week. Only when the app was in use for a few days of that week and it had
// something in it. Never shown twice for the same week.
export function weeklyRecap(data: UserData, today: Date): Recap | null {
  const weekStart = weekStartOf(data);
  const thisWeek = startOfWeek(today, weekStart);
  const seen = data.lastRecapDate ? new Date(`${data.lastRecapDate}T12:00:00`) : new Date(data.createdAt);
  // Installed or dismissed during this very week: the next recap is for this week, next week.
  if (startOfWeek(seen, weekStart) >= thisWeek) return null;

  const first = addDays(thisWeek, -7);
  const last = addDays(thisWeek, -1);
  const usedFrom = new Date(Math.max(first.getTime(), startOfDay(new Date(data.createdAt)).getTime()));
  if (daysBetween(usedFrom, last) + 1 < RECAP_MIN_DAYS) return null;

  let workMins = 0;
  let restMins = 0;
  let earned = 0;
  let goodDays = 0;
  for (let i = 0; i < 7; i++) {
    const s = summarizeDay(data, addDays(first, i));
    workMins += s.workMins;
    restMins += s.restMins;
    earned += s.earned;
    if (s.score > 20) goodDays++;
  }
  const restSlots = data.slots.filter((s) => {
    if (s.state !== 'done' || !s.finishedAt) return false;
    const t = new Date(s.finishedAt);
    return t >= first && t < thisWeek;
  }).length;

  if (workMins === 0 && restMins === 0 && restSlots === 0) return null;
  return { from: dateToStr(first), to: dateToStr(last), workMins, restMins, earned, restSlots, goodDays, slotGoal: data.profile.weeklySlotGoal };
}

// Marks the recap as seen, so the next one comes with the next week.
export function dismissRecap(data: UserData, today: Date): UserData {
  return { ...data, lastRecapDate: dateToStr(today) };
}
