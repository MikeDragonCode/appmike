import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { UserData } from '@/core';

// A running focus (work) session. Stored with its start time so it survives
// the app being closed.
export interface Focus {
  habitId: string;
  startedAt: string; // ISO
}

interface State {
  ready: boolean;
  data: UserData | null;
  focus: Focus | null;
}

const DATA_KEY = 'stl.data.v1';
const FOCUS_KEY = 'stl.focus.v1';

let state: State = { ready: false, data: null, focus: null };
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function isUserData(v: unknown): v is UserData {
  const d = v as UserData | null;
  return Boolean(
    d &&
      typeof d === 'object' &&
      Array.isArray(d.habits) &&
      Array.isArray(d.logs) &&
      Array.isArray(d.slots) &&
      Array.isArray(d.restDays) &&
      typeof d.earnedTimeBank === 'number' &&
      d.profile &&
      typeof d.profile === 'object',
  );
}

// Writes are chained so two quick updates cannot land out of order.
let writeChain: Promise<unknown> = Promise.resolve();
function persist(key: string, value: unknown | null) {
  writeChain = writeChain
    .then(() => (value === null ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, JSON.stringify(value))))
    .catch(() => undefined);
}

export async function loadStore(): Promise<void> {
  let data: UserData | null = null;
  let focus: Focus | null = null;
  try {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (isUserData(parsed)) data = parsed;
  } catch {
    data = null;
  }
  try {
    const raw = await AsyncStorage.getItem(FOCUS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.habitId === 'string' && typeof parsed.startedAt === 'string') focus = parsed;
  } catch {
    focus = null;
  }
  emit({ ready: true, data, focus });
}

export function getState(): State {
  return state;
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

// Replace the user data. Pure functions from core go through here.
export function setData(next: UserData | null): void {
  emit({ ...state, data: next });
  persist(DATA_KEY, next);
}

export function updateData(fn: (d: UserData) => UserData): void {
  if (!state.data) return;
  setData(fn(state.data));
}

export function setFocus(next: Focus | null): void {
  emit({ ...state, focus: next });
  persist(FOCUS_KEY, next);
}

export async function resetAll(): Promise<void> {
  emit({ ready: true, data: null, focus: null });
  persist(DATA_KEY, null);
  persist(FOCUS_KEY, null);
  await writeChain;
}
