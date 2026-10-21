import type { WidgetSnapshot } from '@/core';

// Home screen widget and Live Activity: iOS only (see widgets.ios.ts). Everywhere else this does nothing,
// so the web build, Android and the tests never touch native code.
export function syncNative(_snapshot: WidgetSnapshot): void {}
