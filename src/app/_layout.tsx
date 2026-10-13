import * as Notifications from 'expo-notifications';
import { DarkTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setupNotifications, syncBankNudge, syncRoutineReminders } from '@/services/notifications';
import { loadStore, useStore } from '@/state/store';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
setupNotifications();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
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

export default function RootLayout() {
  const { ready, data } = useStore();

  useEffect(() => {
    loadStore();
  }, []);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;
  const onboarded = Boolean(data?.onboardingComplete);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        {Platform.OS !== 'web' && onboarded ? <NotificationRouter /> : null}
        {onboarded ? <RemindersSync /> : null}
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          </Stack.Protected>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="index" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="book" options={{ presentation: 'modal' }} />
            <Stack.Screen name="close-day" options={{ presentation: 'modal' }} />
            <Stack.Screen name="focus" options={{ presentation: 'modal', gestureEnabled: false }} />
            <Stack.Screen name="slot/[id]" options={{ presentation: 'modal' }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
