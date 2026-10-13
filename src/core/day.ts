import { calculateDailyMetrics } from './scoring';
import { applyDayLog, dateToStr, isRestDay } from './bank';
import { DayLog, ItemLog, UserData } from './types';

export function emptyLog(date: string): DayLog {
  return { date, grindLogs: [], glowLogs: [], earnedTimeDelta: 0, score: 0 };
}

export function getLog(data: UserData, date: string): DayLog | undefined {
  return data.logs.find((l) => l.date === date);
}

export function addToLogs(logs: ItemLog[], habitId: string, amount: number): ItemLog[] {
  const found = logs.some((l) => l.habitId === habitId);
  return found
    ? logs.map((l) => (l.habitId === habitId ? { ...l, value: l.value + amount } : l))
    : [...logs, { habitId, value: amount }];
}

// Recompute a day's delta and score from its logs under the user's current settings.
export function rescoreLog(data: UserData, log: DayLog, date: Date): DayLog {
  const m = calculateDailyMetrics(
    log.grindLogs,
    log.glowLogs,
    data.habits,
    isRestDay(data, date),
    data.dailyGrindHours,
    data.profile.restPerHour,
  );
  return { ...log, earnedTimeDelta: m.earnedTimeDelta, score: m.scoreInfo.score };
}

// Record grind (a timer result or a counter tap). Returns null for unknown/non-grind habits.
export function logGrind(
  data: UserData,
  habitId: string,
  amount: number,
  now: Date,
): { data: UserData; earned: number } | null {
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit || habit.type !== 'grind' || !(amount > 0)) return null;
  const date = dateToStr(now);
  const base = getLog(data, date) ?? emptyLog(date);
  const log = rescoreLog(data, { ...base, grindLogs: addToLogs(base.grindLogs, habitId, amount) }, now);
  return { data: applyDayLog(data, log), earned: amount * (habit.earnRate ?? 0) };
}

// The evening ritual: marks today closed and keeps the first task for tomorrow.
export function closeDay(data: UserData, now: Date, tomorrowFirst?: string): UserData {
  const date = dateToStr(now);
  const base = getLog(data, date) ?? emptyLog(date);
  const note = tomorrowFirst?.trim();
  const log: DayLog = { ...base, closedAt: now.toISOString(), ...(note ? { tomorrowFirst: note } : {}) };
  return applyDayLog(data, log);
}

export function isDayClosed(data: UserData, now: Date): boolean {
  return Boolean(getLog(data, dateToStr(now))?.closedAt);
}
