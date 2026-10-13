# Shift to Life

Work earns rest. Rest gets booked.

A small mobile app (Expo, React Native, TypeScript). You earn rest minutes for focused work, then book them as real slots in your day so rest happens on purpose. Everything stays on the phone: no account, no backend, no tracking.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS camera or the Expo Go app on Android). The phone and the computer must be on the same network. If they are not, use `npx expo start --tunnel`.

Web also works for a quick look (`npx expo start --web`), but notifications and haptics are native only.

## Check it

```bash
npm run typecheck   # app + tests
npm test            # logic tests (node:test, no device needed)
npm run lint
```

## Structure

```
src/core       Pure logic: banking, scoring, slots, plans. No React, no storage. All tested.
src/state      Store (AsyncStorage) and actions that combine core logic with side effects.
src/services   Local notifications.
src/app        Screens (expo-router): onboarding, Today, book, focus, slot, close day, settings.
src/ui         Small shared components.
```

Rule of thumb: rules of the product live in `src/core` and get a test first. Screens only call them.

## How it works

- Work activities earn rest at your chosen ratio (default 30 min of rest per hour).
- Rest activities cost bank minutes. On rest days they cost half.
- Booking a rest slot reserves its cost. Finishing early returns the unused part. At least 80% used counts as taken.
- You may borrow a little rest ahead (default 30 min, 60 if "no energy" is picked), never more.
- With "sleep" picked, rest slots cannot run past bedtime.
- Streaks are forgiving: one missed workday is fine, two in a row end it. Rest days are neutral.

## Not done yet

- Real icon, splash and the final app name check.
- Store listings, privacy policy, subscriptions.
- Follow-up questionnaire after day 3, 7 and 14.
- Device testing on Android and iOS beyond Expo Go.
