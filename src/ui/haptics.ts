import * as Haptics from 'expo-haptics';

// Haptics are a nicety, never a requirement.
export function tap(): void {
  Haptics.selectionAsync().catch(() => undefined);
}
export function success(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
