import { HabitItem, Slot, UserData } from './types';

export const BACKUP_APP = 'shift-to-life';
export const BACKUP_VERSION = 1;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function validHabit(h: unknown): h is HabitItem {
  return (
    isObj(h) &&
    isStr(h.id) &&
    isStr(h.name) &&
    isStr(h.emoji) &&
    (h.type === 'grind' || h.type === 'glow') &&
    (h.valueType === 'duration' || h.valueType === 'counter') &&
    (h.earnRate === undefined || isNum(h.earnRate)) &&
    (h.costRate === undefined || isNum(h.costRate))
  );
}

function validSlot(s: unknown): s is Slot {
  return (
    isObj(s) &&
    isStr(s.id) &&
    isStr(s.habitId) &&
    isNum(s.plannedMins) &&
    isStr(s.startsAt) &&
    !Number.isNaN(Date.parse(s.startsAt)) &&
    ['planned', 'active', 'done', 'partial', 'skipped'].includes(s.state as string) &&
    isNum(s.reservedCost) &&
    (s.recharge === undefined || s.recharge === 0 || s.recharge === 1 || s.recharge === 2)
  );
}

function validLog(l: unknown): boolean {
  return (
    isObj(l) &&
    isStr(l.date) &&
    /^\d{4}-\d{2}-\d{2}$/.test(l.date) &&
    Array.isArray(l.grindLogs) &&
    Array.isArray(l.glowLogs) &&
    isNum(l.earnedTimeDelta) &&
    isNum(l.score)
  );
}

// Structural check of stored or imported data. It cannot prove the numbers are sensible,
// only that the app will not crash on them.
export function isUserData(v: unknown): v is UserData {
  if (!isObj(v)) return false;
  const p = v.profile;
  return (
    Array.isArray(v.habits) &&
    v.habits.every(validHabit) &&
    Array.isArray(v.logs) &&
    v.logs.every(validLog) &&
    Array.isArray(v.slots) &&
    v.slots.every(validSlot) &&
    Array.isArray(v.restDays) &&
    v.restDays.every((d) => isNum(d) && d >= 0 && d <= 6) &&
    isNum(v.earnedTimeBank) &&
    isNum(v.dailyGrindHours) &&
    isStr(v.createdAt) &&
    v.onboardingComplete === true &&
    isObj(p) &&
    isStr(p.workEnd) &&
    isStr(p.bedtime) &&
    isNum(p.restPerHour) &&
    isNum(p.advanceCapMins) &&
    isNum(p.defaultSlotMins) &&
    isNum(p.weeklySlotGoal) &&
    (p.weekStart === undefined || (isNum(p.weekStart) && Number.isInteger(p.weekStart) && p.weekStart >= 0 && p.weekStart <= 6)) &&
    Array.isArray(p.struggles) &&
    (v.momentsSeen === undefined || (Array.isArray(v.momentsSeen) && v.momentsSeen.every(isStr))) &&
    (v.workByHour === undefined || (Array.isArray(v.workByHour) && v.workByHour.length === 24 && v.workByHour.every((n) => isNum(n) && n >= 0)))
  );
}

export function serializeBackup(data: UserData, now: Date): string {
  return JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data }, null, 2);
}

export type BackupError = 'not_json' | 'wrong_file' | 'newer_version' | 'damaged';

export type BackupResult = { ok: true; data: UserData } | { ok: false; error: BackupError };

export function parseBackup(text: string): BackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    return { ok: false, error: 'not_json' };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP || !isNum(raw.version)) return { ok: false, error: 'wrong_file' };
  if (raw.version > BACKUP_VERSION) return { ok: false, error: 'newer_version' };
  if (!isUserData(raw.data)) return { ok: false, error: 'damaged' };
  return { ok: true, data: raw.data };
}
