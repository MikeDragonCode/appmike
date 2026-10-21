# Native pieces (iOS)

Shift to Life is React Native on Expo. Two things are native on iOS and show up only in a development build,
not in Expo Go:

- a home screen / lock screen widget, "Rest to book" (small, medium and lock screen rectangle)
- a Live Activity for a running focus block (lock screen and Dynamic Island), with a timer the system draws

Where things are:

- `src/core/widget.ts`: `widgetSnapshot()` turns the app data into the few numbers the native side needs. Tested.
- `src/native/definitions.tsx`: how the widget and the Live Activity look. The functions marked `'widget'` become
  plain text at build time and run in the widget's own runtime, so nothing from outside them can be used there.
- `src/native/widgets.ios.ts`: loads the above and keeps it in line with the app. In Expo Go it does nothing.
  `src/native/widgets.ts` is the empty version for web and Android.
- `app.json`: the `expo-widgets` plugin declares the widget.
- `src/app/_layout.tsx`: `NativeSync` sends a fresh snapshot whenever what the widget would show has changed.

Trying it on a Mac (simulator, free, no Apple account):

    npm install
    npx expo run:ios

The first build takes a while. After that, open the simulator, long press the home screen, add "Rest to book".
Start a focus block with a goal and lock the simulator (Cmd+L) to see the Live Activity.

Expo Go keeps working for everything else; the widget just is not there.
