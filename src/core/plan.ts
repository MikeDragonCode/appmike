import { formatHM, parseHM } from './time';
import { Selection, materializeHabits } from './catalog';
import { DEFAULT_WEEK_START } from './week';
import { Profile, Struggle, UserData } from './types';

export const STRUGGLES: { id: Struggle; title: string; hint: string }[] = [
  { id: 'sleep', title: 'Not enough sleep', hint: 'Evenings slide into the night' },
  { id: 'overwork', title: 'I work too late', hint: 'The workday never really ends' },
  { id: 'no_energy', title: 'No energy after work', hint: 'Too drained to do anything' },
  { id: 'scrolling', title: 'Rest turns into scrolling', hint: 'Hours go by and nothing feels restful' },
  { id: 'no_time_hobbies', title: 'No time for hobbies or sport', hint: 'The things I like keep getting skipped' },
];

export const MAX_STRUGGLES = 2;

export const PACE_OPTIONS = [
  { hours: 3, title: 'Light', hint: 'A few focused hours and you are done' },
  { hours: 8, title: 'Standard', hint: 'A classic full-time rhythm' },
  { hours: 12, title: 'Heavy', hint: 'Long shifts, rest is sacred' },
];

export const REST_PRESETS = [
  { restPerHour: 45, title: 'Casual', hint: '1 hour of work = 45 min of rest' },
  { restPerHour: 30, title: 'Balanced', hint: '1 hour of work = 30 min of rest' },
  { restPerHour: 15, title: 'Hardcore', hint: '1 hour of work = 15 min of rest' },
];

export const REST_PER_HOUR_MIN = 5;
export const REST_PER_HOUR_MAX = 60;

export interface Answers {
  struggles: Struggle[];
  paceHours: number;
  workEnd: string;
  bedtime: string;
  restPerHour: number;
  restDays: number[];
  weekStart?: number; // 0 = Sunday, 1 = Monday; Monday when not given
}

export const WIND_DOWN_BEFORE_BED_MINS = 45;

// The "value mapping": what each answer switches on.
export function buildProfile(a: Answers): Profile {
  const has = (s: Struggle) => a.struggles.includes(s);
  return {
    struggles: a.struggles,
    workEnd: a.workEnd,
    bedtime: a.bedtime,
    restPerHour: a.restPerHour,
    hardBedtime: has('sleep'),
    advanceCapMins: has('no_energy') ? 60 : 30,
    defaultSlotMins: has('no_energy') ? 30 : 60,
    weeklySlotGoal: has('no_time_hobbies') ? 3 : 0,
    weekStart: a.weekStart ?? DEFAULT_WEEK_START,
    remindClose: has('overwork'),
    remindWindDown: has('sleep'),
    remindBank: true,
  };
}

// Plain-language summary of what the answers configured, shown after onboarding.
export function describePlan(p: Profile): string[] {
  const lines: string[] = [];
  if (p.struggles.includes('sleep')) {
    lines.push(`Rest slots can't run past ${p.bedtime}, and a wind-down reminder comes ${WIND_DOWN_BEFORE_BED_MINS} min earlier.`);
  }
  if (p.struggles.includes('overwork')) {
    lines.push(`A daily nudge at ${p.workEnd} to close the workday.`);
  }
  if (p.struggles.includes('no_energy')) {
    lines.push(`Shorter rest slots (${p.defaultSlotMins} min) and you can borrow up to ${p.advanceCapMins} min of rest ahead.`);
  }
  if (p.struggles.includes('scrolling')) {
    lines.push('Rest is booked before it is spent, so scrolling becomes a choice instead of a default.');
  }
  if (p.struggles.includes('no_time_hobbies')) {
    lines.push(`Goal: ${p.weeklySlotGoal} completed rest slots a week.`);
  }
  if (lines.length === 0) {
    lines.push(`A balanced start: ${p.defaultSlotMins}-minute rest slots, borrow up to ${p.advanceCapMins} min ahead.`);
  }
  lines.push(`Every hour of focused work earns you ${p.restPerHour} min of rest.`);
  return lines;
}

export interface OnboardingInput {
  answers: Answers;
  selection: Selection;
}

export function createInitialData(input: OnboardingInput, now: Date): UserData {
  const { answers, selection } = input;
  return {
    habits: materializeHabits(selection, answers.restPerHour),
    logs: [],
    earnedTimeBank: 0,
    onboardingComplete: true,
    createdAt: now.toISOString(),
    restDays: answers.restDays,
    dailyGrindHours: answers.paceHours,
    profile: buildProfile(answers),
    slots: [],
  };
}

// Onboarding validation: at least this many activities of each kind.
export const MIN_ACTIVITIES = 2;

export function selectionIsValid(sel: Selection): boolean {
  const grind = sel.grindIds.length + sel.customGrind.length;
  const glow = sel.glowIds.length + sel.customGlow.length;
  return grind >= MIN_ACTIVITIES && glow >= MIN_ACTIVITIES;
}

export function shiftTime(hm: string, deltaMins: number): string {
  return formatHM(parseHM(hm) + deltaMins);
}


// Changing the reward ratio later: earn rates of grind activities scale with it,
// so every activity keeps its relative weight. Past days are not rescored.
export function changeRestPerHour(data: UserData, restPerHour: number): UserData {
  const next = Math.min(REST_PER_HOUR_MAX, Math.max(REST_PER_HOUR_MIN, Math.round(restPerHour)));
  const old = data.profile.restPerHour;
  if (next === old || old <= 0) return data;
  const k = next / old;
  return {
    ...data,
    profile: { ...data.profile, restPerHour: next },
    habits: data.habits.map((h) => (h.type === 'grind' && h.earnRate !== undefined ? { ...h, earnRate: h.earnRate * k } : h)),
  };
}

// ---- Follow-up check-ins (day 3, 7 and 14) ----

export const CHECKIN_DAYS = [3, 7, 14] as const;

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(fromIso);
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

// The latest check-in stage that has come due and was not answered yet.
// Older missed stages are folded into the latest one: one question, not three.
export function dueCheckin(data: UserData, now: Date): number | null {
  const age = daysBetween(data.createdAt, now);
  const done = data.checkinsDone ?? [];
  const passed = CHECKIN_DAYS.filter((d) => d <= age);
  const latest = passed[passed.length - 1];
  if (latest === undefined || done.includes(latest)) return null;
  return latest;
}

// Re-derives only the rules that come from "what is hardest", keeping every other setting.
export function applyStruggles(profile: Profile, struggles: Struggle[]): Profile {
  const fresh = buildProfile({
    struggles,
    paceHours: 8,
    workEnd: profile.workEnd,
    bedtime: profile.bedtime,
    restPerHour: profile.restPerHour,
    restDays: [],
  });
  return {
    ...profile,
    struggles,
    hardBedtime: fresh.hardBedtime,
    advanceCapMins: fresh.advanceCapMins,
    defaultSlotMins: fresh.defaultSlotMins,
    weeklySlotGoal: fresh.weeklySlotGoal,
    remindClose: fresh.remindClose,
    remindWindDown: fresh.remindWindDown,
  };
}

// Marks a stage and everything before it as handled. Pass struggles to update the rules,
// or leave them out to keep the plan as it is.
export function completeCheckin(data: UserData, stage: number, struggles?: Struggle[]): UserData {
  const done = Array.from(new Set([...(data.checkinsDone ?? []), ...CHECKIN_DAYS.filter((d) => d <= stage)]));
  return {
    ...data,
    checkinsDone: done,
    profile: struggles ? applyStruggles(data.profile, struggles) : data.profile,
  };
}
