import { isRestDay } from './bank';
import { REST_DAY_GLOW_DISCOUNT } from './scoring';
import { UserData } from './types';

export const CSV_HEADER = 'date,kind,activity,amount,unit,rest_minutes,rest_day';

// Text fields are quoted when needed, and a leading = + - @ is defused so a
// spreadsheet never reads an activity name as a formula.
export function csvText(s: string): string {
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const round1 = (n: number) => String(Math.round(n * 10) / 10);

// One row per activity per day, oldest first. rest_minutes is signed: work adds,
// rest subtracts (at half price on rest days), using each activity's current rate.
export function toCsv(data: UserData): string {
  const rows = [CSV_HEADER];
  const logs = [...data.logs].sort((a, b) => a.date.localeCompare(b.date));
  for (const log of logs) {
    const restDay = isRestDay(data, new Date(`${log.date}T12:00:00`));
    const factor = restDay ? REST_DAY_GLOW_DISCOUNT : 1;
    const add = (kind: 'work' | 'rest', habitId: string, value: number) => {
      const h = data.habits.find((x) => x.id === habitId);
      if (!h) return;
      const rest = kind === 'work' ? value * (h.earnRate ?? 0) : -value * (h.costRate ?? 0) * factor;
      rows.push(
        [log.date, kind, csvText(h.name), round1(value), h.valueType === 'counter' ? 'count' : 'min', round1(rest), restDay ? 'yes' : 'no'].join(','),
      );
    };
    log.grindLogs.forEach((l) => add('work', l.habitId, l.value));
    log.glowLogs.forEach((l) => add('rest', l.habitId, l.value));
  }
  return rows.join('\n') + '\n';
}
