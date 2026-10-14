import { dateToStr } from './bank';
import { UserData } from './types';

// Weekdays are numbered like Date.getDay(): 0 = Sunday .. 6 = Saturday.
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const MONDAY = 1;
export const SUNDAY = 0;
export const DEFAULT_WEEK_START = MONDAY;

// Regions whose calendars start the week on Sunday. Everywhere else it is Monday.
// (Not the full CLDR list: Portugal, for one, would come out as Sunday there, and a
// working week that starts on Monday is what people in Europe expect from a planner.)
const SUNDAY_REGIONS = ['US', 'CA', 'MX', 'BR', 'JP', 'IN', 'PH', 'IL', 'KR'];

export function defaultWeekStart(region?: string): number {
  return region && SUNDAY_REGIONS.includes(region.toUpperCase()) ? SUNDAY : DEFAULT_WEEK_START;
}

// Older saved data has no week start; it gets Monday.
export function weekStartOf(data: UserData): number {
  const w = data.profile.weekStart;
  return typeof w === 'number' && Number.isInteger(w) && w >= 0 && w <= 6 ? w : DEFAULT_WEEK_START;
}

// The seven weekdays in the order a week shows them: [1,2,3,4,5,6,0] for Monday.
export function weekdayOrder(weekStart: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
}

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// Local midnight of the first day of the calendar week that contains `day`.
export function startOfWeek(day: Date, weekStart: number): Date {
  const midnight = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  return addDays(midnight, -((midnight.getDay() - weekStart + 7) % 7));
}

export interface WeekDay {
  date: string; // YYYY-MM-DD
  score: number;
  isToday: boolean;
  isFuture: boolean;
}

// The calendar week that contains `today`, first day to last. Days still to come are
// marked so they can be drawn empty instead of looking like missed days.
export function currentWeek(data: UserData, today: Date): WeekDay[] {
  const start = startOfWeek(today, weekStartOf(data));
  const todayStr = dateToStr(today);
  return Array.from({ length: 7 }, (_, i) => {
    const date = dateToStr(addDays(start, i));
    const log = data.logs.find((l) => l.date === date);
    return { date, score: log?.score || 0, isToday: date === todayStr, isFuture: date > todayStr };
  });
}

// Rest slots completed this calendar week: what the weekly goal counts.
export function doneSlotsThisWeek(data: UserData, today: Date): number {
  const from = startOfWeek(today, weekStartOf(data));
  return data.slots.filter((s) => s.state === 'done' && s.finishedAt && new Date(s.finishedAt) >= from).length;
}
