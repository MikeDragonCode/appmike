import * as Notifications from 'expo-notifications';
import { DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { expireSlots, widgetSnapshot } from '@/core';
import { syncNative } from '@/native/widgets';
import { cancelSlotNotifications, setupNotifications, syncBankNudge, syncRoutineReminders } from '@/services/notifications';
import { getState, loadStore, setData, useStore } from '@/state/store';
import { colors } from '@/theme';
import { Recovery } from '@/ui/Recovery';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
setupNotifications();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.text,
  },
};

// Opens the rest slot when its notification is tapped.
function NotificationRouter() {
  const router = useRouter();
  const last = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const id = last?.notification.request.identifier;
    const slotId = last?.notification.request.content.data?.slotId;
    if (!id || handled.current === id || typeof slotId !== 'string') return;
    handled.current = id;
    router.push({ pathname: '/slot/[id]', params: { id: slotId } });
  }, [last, router]);
  return null;
}

// Keeps scheduled reminders in line with the settings and the bank.
function RemindersSync() {
  const { data } = useStore();
  const profile = data?.profile;
  useEffect(() => {
    if (profile) syncRoutineReminders(profile);
  }, [profile]);
  const bankKey = data ? `${data.profile.remindBank}|${Math.floor(data.earnedTimeBank / 15)}|${data.slots.length}` : '';
  useEffect(() => {
    if (data) syncBankNudge(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankKey]);
  return null;
}

// Keeps the home screen widget and the focus Live Activity in line with the app. Only talks to the
// native side when what they would show has actually changed.
function NativeSync() {
  const { data, focus } = useStore();
  const key = data ? JSON.stringify(widgetSnapshot(data, focus)) : '';
  useEffect(() => {
    if (key) syncNative(JSON.parse(key));
  }, [key]);
  return null;
}

// Closes rest slots the user walked away from, so reserved rest never stays stuck.
function Housekeeping() {
  useEffect(() => {
    const run = () => {
      const d = getState().data;
      if (!d) return;
      const r = expireSlots(d, new Date());
      if (r.data === d) return;
      setData(r.data);
      r.expired.forEach((slot) => cancelSlotNotifications(slot.id));
    };
    run();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') run();
    });
    const timer = setInterval(run, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return null;
}

export default function RootLayout() {
  const { ready, data, unreadable } = useStore();

  useEffect(() => {
    loadStore();
  }, []);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  if (!data && unreadable) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Recovery raw={unreadable} />
      </SafeAreaProvider>
    );
  }
  const onboarded = Boolean(data?.onboardingComplete);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="dark" />
        {Platform.OS !== 'web' && onboarded ? <NotificationRouter /> : null}
        {onboarded ? <RemindersSync /> : null}
        {onboarded ? <Housekeeping /> : null}
        {onboarded && Platform.OS === 'ios' ? <NativeSync /> : null}
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          </Stack.Protected>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="index" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="history" />
            <Stack.Screen name="how-it-works" />
            <Stack.Screen name="activities" />
            <Stack.Screen name="backup" />
            <Stack.Screen name="book" options={{ presentation: 'modal' }} />
            <Stack.Screen name="close-day" options={{ presentation: 'modal' }} />
            <Stack.Screen name="log-rest" options={{ presentation: 'modal' }} />
            <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
            <Stack.Screen name="focus" options={{ presentation: 'modal', gestureEnabled: false }} />
            <Stack.Screen name="slot/[id]" options={{ presentation: 'modal' }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
