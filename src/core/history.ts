import { applyDayLog, dateToStr, isRestDay } from './bank';
import { addToLogs, emptyLog, getLog } from './day';
import { REST_DAY_GLOW_DISCOUNT, calculateDailyMetrics } from './scoring';
import { summarizeDay } from './summary';
import { DayLog, HabitItem, ItemLog, UserData } from './types';

export interface HistoryEntry {
  habit: HabitItem;
  kind: 'work' | 'rest';
  value: number;
}

export interface HistoryDay {
  date: string;
  restDay: boolean;
  workMins: number;
  restMins: number;
  earned: number;
  spent: number;
  closed: boolean;
  tomorrowFirst?: string;
  entries: HistoryEntry[];
}

const noon = (date: string) => new Date(`${date}T12:00:00`);

function entriesOf(data: UserData, log: DayLog): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  for (const l of log.grindLogs) {
    const habit = data.habits.find((h) => h.id === l.habitId);
    if (habit) out.push({ habit, kind: 'work', value: l.value });
  }
  for (const l of log.glowLogs) {
    const habit = data.habits.find((h) => h.id === l.habitId);
    if (habit) out.push({ habit, kind: 'rest', value: l.value });
  }
  return out;
}

// Days that have something recorded, newest first.
export function listDays(data: UserData, limit = 30): HistoryDay[] {
  return [...data.logs]
    .filter((l) => l.grindLogs.length > 0 || l.glowLogs.length > 0 || l.closedAt)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((log) => {
      const s = summarizeDay(data, noon(log.date));
      return {
        date: log.date,
        restDay: isRestDay(data, noon(log.date)),
        workMins: s.workMins,
        restMins: s.restMins,
        earned: s.earned,
        spent: s.spent,
        closed: s.closed,
        tomorrowFirst: s.tomorrowFirst,
        entries: entriesOf(data, log),
      };
    });
}

export const MAX_EDIT_DAYS_BACK = 60;
export const MAX_DURATION_MINS = 24 * 60;
export const MAX_COUNT = 99;

export type EditError = 'unknown_activity' | 'bad_value' | 'bad_date';

export type EditResult = { ok: true; data: UserData } | { ok: false; error: EditError };

// Sets how much of an activity a past (or the current) day holds. 0 removes the entry.
// Only the change is applied to the bank, at the activity's current rate, so days
// you do not touch keep exactly what they had, even after you changed your ratios.
export function setLogEntry(data: UserData, today: Date, date: string, habitId: string, value: number): EditResult {
  const habit = data.habits.find((h) => h.id === habitId);
  if (!habit) return { ok: false, error: 'unknown_activity' };
  if (!Number.isFinite(value) || value < 0) return { ok: false, error: 'bad_value' };
  const max = habit.valueType === 'duration' ? MAX_DURATION_MINS : MAX_COUNT;
  if (value > max) return { ok: false, error: 'bad_value' };
  const v = habit.valueType === 'counter' ? Math.round(value) : value;

  const day = noon(date);
  const earliest = new Date(today.getFullYear(), today.getMonth(), today.getDate() - MAX_EDIT_DAYS_BACK);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(day.getTime()) || dateToStr(day) !== date) {
    return { ok: false, error: 'bad_date' };
  }
  if (day.getTime() < earliest.getTime() || dateToStr(day) > dateToStr(today)) return { ok: false, error: 'bad_date' };

  const base = getLog(data, date) ?? emptyLog(date);
  const key = habit.type === 'grind' ? 'grindLogs' : 'glowLogs';
  const current = base[key].find((l) => l.habitId === habitId)?.value ?? 0;
  const diff = v - current;

  const logs: ItemLog[] =
    v === 0
      ? base[key].filter((l) => l.habitId !== habitId)
      : current === 0
        ? addToLogs(base[key], habitId, v)
        : base[key].map((l) => (l.habitId === habitId ? { ...l, value: v } : l));

  const factor = isRestDay(data, day) ? REST_DAY_GLOW_DISCOUNT : 1;
  const delta = habit.type === 'grind' ? diff * (habit.earnRate ?? 0) : -diff * (habit.costRate ?? 0) * factor;
  const next: DayLog = { ...base, [key]: logs, earnedTimeDelta: base.earnedTimeDelta + delta };
  const score = calculateDailyMetrics(
    next.grindLogs,
    next.glowLogs,
    data.habits,
    isRestDay(data, day),
    data.dailyGrindHours,
    data.profile.restPerHour,
  ).scoreInfo.score;
  return { ok: true, data: applyDayLog(data, { ...next, score }) };
}
