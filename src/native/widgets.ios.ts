import type { WidgetSnapshot } from '@/core';

type Definitions = typeof import('./definitions');

// Expo Go has no widget module, so loading it fails there. That is expected: the widget and the Live Activity
// only exist in a development build or a release build, and in Expo Go this quietly does nothing.
let defs: Definitions | null | undefined;
function load(): Definitions | null {
  if (defs === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      defs = require('./definitions') as Definitions;
    } catch {
      defs = null;
    }
  }
  return defs;
}

// Brings the widget and the focus Live Activity in line with the app. Safe to call often and from anywhere:
// it never throws, and a failure here must never get in the way of the app itself.
export function syncNative(snapshot: WidgetSnapshot): void {
  const d = load();
  if (!d) return;
  try {
    d.RestWidget.updateSnapshot(snapshot);
  } catch {
    // the widget is optional
  }
  try {
    const running = d.FocusActivity.getInstances();
    const f = snapshot.focus;
    if (!f) {
      for (const a of running) void a.end('immediate').catch(() => undefined);
      return;
    }
    const props = { name: f.name, startedAt: f.startedAt, goalMins: f.goalMins };
    if (running.length === 0) d.FocusActivity.start(props);
    else void running[0].update(props).catch(() => undefined);
  } catch {
    // Live Activities may be switched off by the user
  }
}
