import { HabitItem, Profile, UserData } from '../types';

export const defaultProfile: Profile = {
  struggles: [],
  workEnd: '18:00',
  bedtime: '23:00',
  restPerHour: 30,
  hardBedtime: false,
  advanceCapMins: 30,
  defaultSlotMins: 60,
  weeklySlotGoal: 0,
  remindClose: false,
  remindWindDown: false,
  remindBank: true,
};

export const deepWork: HabitItem = { id: 'g1', name: 'Deep Work', emoji: '💻', type: 'grind', valueType: 'duration', earnRate: 0.5 };
export const cook: HabitItem = { id: 'g3', name: 'Cook', emoji: '🍳', type: 'grind', valueType: 'counter', earnRate: 15 };
export const ps5: HabitItem = { id: 'gl1', name: 'PS5', emoji: '🎮', type: 'glow', valueType: 'duration', costRate: 1 };
export const doom: HabitItem = { id: 'gl3', name: 'Doomscrolling', emoji: '📱', type: 'glow', valueType: 'duration', costRate: 1.5 };

export const makeData = (over: Partial<UserData> = {}): UserData => ({
  habits: [deepWork, cook, ps5, doom],
  logs: [],
  earnedTimeBank: 0,
  onboardingComplete: true,
  createdAt: new Date(2026, 9, 1, 9, 0, 0).toISOString(),
  restDays: [0, 6],
  dailyGrindHours: 8,
  profile: defaultProfile,
  slots: [],
  ...over,
});
