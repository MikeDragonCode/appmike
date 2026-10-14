import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { UserData, isUserData } from '@/core';

// A running focus (work) session. Stored with its start time so it survives
// the app being closed.
export interface Focus {
  habitId: string;
  startedAt: string; // ISO
  goalMins?: number; // an optional target; reaching it sends one quiet notification
}

interface State {
  ready: boolean;
  data: UserData | null;
  focus: Focus | null;
  unreadable: string | null; // stored data that could not be read, kept so it can be rescued
  saveFailed: boolean; // the last write to storage failed
}

const DATA_KEY = 'stl.data.v1';
const FOCUS_KEY = 'stl.focus.v1';

let state: State = { ready: false, data: null, focus: null, unreadable: null, saveFailed: false };
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

// Writes are chained so two quick updates cannot land out of order. A failed write
// (full storage, say) is remembered so the app can say so instead of pretending.
let writeChain: Promise<unknown> = Promise.resolve();
function persist(key: string, value: unknown | null) {
  writeChain = writeChain
    .then(async () => {
      if (value === null) await AsyncStorage.removeItem(key);
      else await AsyncStorage.setItem(key, JSON.stringify(value));
      if (state.saveFailed) emit({ ...state, saveFailed: false });
    })
    .catch(() => {
      if (!state.saveFailed) emit({ ...state, saveFailed: true });
    });
}

export async function loadStore(): Promise<void> {
  let data: UserData | null = null;
  let focus: Focus | null = null;
  let unreadable: string | null = null;
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(DATA_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (isUserData(parsed)) data = parsed;
    else if (raw) unreadable = raw;
  } catch {
    // Stored text that is not valid JSON, or storage that failed to open.
    if (raw) unreadable = raw;
  }
  if (unreadable) {
    // Never throw away what we cannot read: keep it aside so it can be recovered.
    try {
      await AsyncStorage.setItem(`${DATA_KEY}.unreadable`, unreadable);
    } catch {
      // the copy in memory is still offered on screen
    }
  }
  try {
    const raw = await AsyncStorage.getItem(FOCUS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.habitId === 'string' && typeof parsed.startedAt === 'string') {
      const goal = parsed.goalMins;
      focus = { habitId: parsed.habitId, startedAt: parsed.startedAt, ...(typeof goal === 'number' && goal > 0 ? { goalMins: goal } : {}) };
    }
  } catch {
    focus = null;
  }
  emit({ ready: true, data, focus, unreadable, saveFailed: false });
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
  emit({ ...state, data: next, unreadable: next ? null : state.unreadable });
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

// Gives up on unreadable data and starts clean. The aside copy stays in storage.
export function discardUnreadable(): void {
  emit({ ...state, unreadable: null });
}

export async function resetAll(): Promise<void> {
  emit({ ready: true, data: null, focus: null, unreadable: null, saveFailed: false });
  persist(DATA_KEY, null);
  persist(FOCUS_KEY, null);
  await writeChain;
}
