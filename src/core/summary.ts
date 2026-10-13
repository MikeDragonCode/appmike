import { dateToStr, isRestDay } from './bank';
import { getLog, isDayClosed } from './day';
import { REST_DAY_GLOW_DISCOUNT } from './scoring';
import { availableMins, nextOpenSlot } from './slots';
import { minutesOfDay, parseHM } from './time';
import { UserData } from './types';

export interface DaySummary {
  earned: number; // rest minutes earned by work
  spent: number; // bank minutes spent on rest
  workMins: number; // minutes of timed work
  restMins: number; // minutes of rest taken
  score: number;
  closed: boolean;
  tomorrowFirst?: string;
}

export function summarizeDay(data: UserData, date: Date): DaySummary {
  const log = getLog(data, dateToStr(date));
  if (!log) return { earned: 0, spent: 0, workMins: 0, restMins: 0, score: 0, closed: false };
  const factor = isRestDay(data, date) ? REST_DAY_GLOW_DISCOUNT : 1;
  let earned = 0;
  let spent = 0;
  let workMins = 0;
  let restMins = 0;
  for (const l of log.grindLogs) {
    const h = data.habits.find((x) => x.id === l.habitId);
    if (!h) continue;
    earned += l.value * (h.earnRate ?? 0);
    if (h.valueType === 'duration') workMins += l.value;
  }
  for (const l of log.glowLogs) {
    const h = data.habits.find((x) => x.id === l.habitId);
    if (!h) continue;
    spent += l.value * (h.costRate ?? 0) * factor;
    restMins += l.value;
  }
  return { earned, spent, workMins, restMins, score: log.score, closed: Boolean(log.closedAt), tomorrowFirst: log.tomorrowFirst };
}

export type HintKind = 'closed' | 'debt' | 'close' | 'book' | 'start' | 'idle';

// One calm sentence about what makes sense right now. Never nags: it is
// derived from the data, so it simply goes away when the thing is done.
export function todayHint(data: UserData, now: Date): { kind: HintKind; text: string } {
  const avail = Math.floor(availableMins(data));
  const closed = isDayClosed(data, now);
  const afterWork = minutesOfDay(now) >= parseHM(data.profile.workEnd);
  const worked = summarizeDay(data, now).workMins > 0 || (getLog(data, dateToStr(now))?.grindLogs.length ?? 0) > 0;

  if (avail < 0) {
    return { kind: 'debt', text: `You borrowed ${-avail} min of rest ahead. Your next focus block pays it back.` };
  }
  if (!closed && afterWork) {
    return { kind: 'close', text: 'The workday is over. Close it when you are ready.' };
  }
  if (avail >= data.profile.defaultSlotMins && !nextOpenSlot(data)) {
    return { kind: 'book', text: `You have ${avail} min of rest saved. Book it so it actually happens.` };
  }
  if (closed) return { kind: 'closed', text: 'Day closed. Rest well.' };
  if (!worked && !isRestDay(data, now)) {
    return { kind: 'start', text: 'Start with one focus block. The rest follows.' };
  }
  return { kind: 'idle', text: 'You are on track.' };
}
