export interface HabitItem {
  id: string;
  name: string;
  emoji: string;
  type: 'grind' | 'glow';
  valueType: 'duration' | 'counter';
  // grind: rest minutes earned per 1 unit (a minute, or one completion)
  earnRate?: number;
  // glow: bank minutes spent per 1 unit
  costRate?: number;
  // when this glow fits the day (used by suggestions)
  window?: 'any' | 'morning' | 'day' | 'evening';
  // Removed by the user. Kept so past days and open slots still resolve it.
  archived?: boolean;
}

export interface ItemLog {
  habitId: string;
  value: number; // minutes or count logged
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  grindLogs: ItemLog[];
  glowLogs: ItemLog[];
  earnedTimeDelta: number; // time added/subtracted by this day
  score: number;
  closedAt?: string; // ISO time the day was closed with the evening ritual
  tomorrowFirst?: string; // "first task for tomorrow" written during the ritual
}

// What the user says is hardest right now (onboarding question, up to two).
export type Struggle = 'sleep' | 'overwork' | 'no_energy' | 'scrolling' | 'no_time_hobbies';

export interface Profile {
  struggles: Struggle[];
  workEnd: string; // 'HH:MM' - when the workday should end
  bedtime: string; // 'HH:MM'
  restPerHour: number; // minutes of rest earned per hour of focused work
  hardBedtime: boolean; // rest slots may not run into the quiet window
  advanceCapMins: number; // how far the bank may go below zero
  defaultSlotMins: number;
  weeklySlotGoal: number; // completed rest slots per week, 0 = off
  remindClose: boolean; // daily nudge at workEnd to close the day
  remindWindDown: boolean; // nudge before bedtime
  remindBank: boolean; // nudge when earned rest piles up unbooked
}

export type SlotState = 'planned' | 'active' | 'done' | 'partial' | 'skipped';

// A booked piece of rest. While planned/active it reserves bank minutes.
export interface Slot {
  id: string;
  habitId: string; // a glow activity
  plannedMins: number;
  startsAt: string; // ISO
  state: SlotState;
  reservedCost: number; // bank minutes held while planned/active
  startedAt?: string;
  finishedAt?: string;
  actualMins?: number;
  notificationId?: string;
}

export interface UserData {
  habits: HabitItem[];
  logs: DayLog[];
  earnedTimeBank: number; // total minutes earned minus minutes spent
  onboardingComplete: boolean;
  createdAt: string;
  restDays: number[]; // 0 = Sunday .. 6 = Saturday
  dailyGrindHours: number; // typical grind-day length (3 light, 8 standard, 12 heavy)
  profile: Profile;
  slots: Slot[];
  lastRecapDate?: string;
  checkinsDone?: number[]; // follow-up stages already answered or dismissed (3, 7, 14)
}

export interface DayScore {
  score: number;
  label: string;
  labelClass: string;
}
