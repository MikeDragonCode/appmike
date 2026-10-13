import { UserData, DayLog } from './types';

// Pure counterparts of the helpers in src/lib/store.ts: no localStorage and no
// hidden "now". Behaviour is intentionally identical to the web version so the
// tests describe what the app does today. The current date is always passed in.

export function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isRestDay(data: UserData, date: Date): boolean {
  return (data.restDays || []).includes(date.getDay());
}

// Same maths as store.saveDayLog, but returns a new object and leaves the input
// untouched. Re-saving a date applies only the difference to the bank.
export function applyDayLog(data: UserData, log: DayLog): UserData {
  const idx = data.logs.findIndex((l) => l.date === log.date);
  const previousDelta = idx >= 0 ? data.logs[idx].earnedTimeDelta : 0;
  const logs = idx >= 0 ? data.logs.map((l, i) => (i === idx ? log : l)) : [...data.logs, log];
  return {
    ...data,
    logs,
    earnedTimeBank: data.earnedTimeBank + (log.earnedTimeDelta - previousDelta),
  };
}

// A day keeps the streak alive if it scored > 20. A rest day neither counts
// nor breaks. Today without a log does not break the streak yet.
export function getStreak(data: UserData, today: Date): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const log = data.logs.find((l) => l.date === dateToStr(d));
    const active = log && log.score > 20;
    if (active) {
      streak++;
    } else if (isRestDay(data, d)) {
      continue;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function getBestStreak(data: UserData, today: Date): number {
  if (data.logs.length === 0) return 0;
  const start = new Date(data.createdAt);
  let best = 0;
  let current = 0;
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const log = data.logs.find((l) => l.date === dateToStr(d));
    if (log && log.score > 20) {
      current++;
      best = Math.max(best, current);
    } else if (!isRestDay(data, d)) {
      current = 0;
    }
  }
  return Math.max(best, getStreak(data, today));
}

export function getLast7Days(data: UserData, today: Date): { date: string; score: number }[] {
  const result: { date: string; score: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = dateToStr(d);
    const log = data.logs.find((l) => l.date === date);
    result.push({ date, score: log?.score || 0 });
  }
  return result;
}

// Forgiving streak. A day with score > 20 extends it. Rest days are neutral.
// Today without a log is still open. One missed workday is forgiven; the
// streak ends only after two missed workdays in a row.
export function getSoftStreak(data: UserData, today: Date): number {
  let streak = 0;
  let misses = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const log = data.logs.find((l) => l.date === dateToStr(d));
    if (log && log.score > 20) {
      streak++;
      misses = 0;
    } else if (isRestDay(data, d) || i === 0) {
      continue;
    } else {
      misses++;
      if (misses >= 2) break;
    }
  }
  return streak;
}
