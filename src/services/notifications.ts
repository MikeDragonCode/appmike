import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { WIND_DOWN_BEFORE_BED_MINS, Profile, Slot, UserData, availableMins, formatHM, parseHM } from '@/core';

// Local notifications only: nothing leaves the device. On web everything here
// is a safe no-op.
const supported = Platform.OS !== 'web';
const CHANNEL = 'default';

const ID_CLOSE = 'daily-close';
const ID_WIND_DOWN = 'wind-down';
const ID_BANK = 'bank-nudge';
const slotStartId = (slotId: string) => `slot-start-${slotId}`;
const slotEndId = (slotId: string) => `slot-end-${slotId}`;

export function setupNotifications(): void {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  // The channel must exist before the permission prompt on Android 13+.
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Asks once, when the user does something that needs a reminder.
export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

async function hasPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

async function cancel(id: string): Promise<void> {
  if (!supported) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // already gone
  }
}

async function scheduleAt(id: string, title: string, body: string, date: Date, data?: Record<string, unknown>) {
  await cancel(id);
  if (date.getTime() <= Date.now() + 1000) return;
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, data },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
  });
}

export async function scheduleSlotStart(slot: Slot, habitName: string): Promise<void> {
  if (!(await hasPermission())) return;
  try {
    await scheduleAt(
      slotStartId(slot.id),
      'Your rest is starting',
      `${habitName}, ${slot.plannedMins} min. You earned it.`,
      new Date(slot.startsAt),
      { slotId: slot.id },
    );
  } catch {
    // reminders are best effort
  }
}

export async function scheduleSlotEnd(slot: Slot, habitName: string, endsAt: Date): Promise<void> {
  if (!(await hasPermission())) return;
  try {
    await scheduleAt(slotEndId(slot.id), 'Time is up', `${habitName} is done. Finish it when you are ready.`, endsAt, {
      slotId: slot.id,
    });
  } catch {
    // best effort
  }
}

export async function cancelSlotNotifications(slotId: string): Promise<void> {
  await cancel(slotStartId(slotId));
  await cancel(slotEndId(slotId));
}

function dailyAt(hm: string, offsetMins = 0): { hour: number; minute: number } {
  const total = (((parseHM(hm) + offsetMins) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

// Keeps the routine reminders in line with the profile. Safe to call often.
export async function syncRoutineReminders(profile: Profile): Promise<void> {
  if (!(await hasPermission())) return;
  try {
    await cancel(ID_CLOSE);
    await cancel(ID_WIND_DOWN);
    if (profile.remindClose) {
      const t = dailyAt(profile.workEnd);
      await Notifications.scheduleNotificationAsync({
        identifier: ID_CLOSE,
        content: { title: 'Time to close the day', body: 'Two minutes to wrap up. Tomorrow starts easier.' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...t, channelId: CHANNEL },
      });
    }
    if (profile.remindWindDown) {
      const t = dailyAt(profile.bedtime, -WIND_DOWN_BEFORE_BED_MINS);
      await Notifications.scheduleNotificationAsync({
        identifier: ID_WIND_DOWN,
        content: {
          title: 'Wind down',
          body: `Bedtime is ${formatHM(parseHM(profile.bedtime))}. Start slowing the evening.`,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...t, channelId: CHANNEL },
      });
    }
  } catch {
    // best effort
  }
}

// One gentle nudge when earned rest is piling up unbooked.
export async function syncBankNudge(data: UserData): Promise<void> {
  if (!(await hasPermission())) return;
  try {
    const pile = availableMins(data);
    if (!data.profile.remindBank || pile < 60) {
      await cancel(ID_BANK);
      return;
    }
    const at = new Date();
    at.setHours(18, 30, 0, 0);
    if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
    await scheduleAt(
      ID_BANK,
      'Rest is waiting',
      `You have ${Math.floor(pile)} min of rest saved. Book a slot so it actually happens.`,
      at,
    );
  } catch {
    // best effort
  }
}

export async function cancelAllReminders(): Promise<void> {
  if (!supported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // nothing to cancel
  }
}
