import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  HabitItem,
  UserData,
  availableMins,
  dateToStr,
  doneSlotsLast7,
  dueCheckin,
  getLast7Days,
  getLog,
  getSoftStreak,
  isRestDay,
  logGrind,
  nextOpenSlot,
  reservedMins,
  summarizeDay,
  todayHint,
} from '@/core';
import { updateData, useStore } from '@/state/store';
import { useNow } from '@/hooks/useNow';
import { colors, radius, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider } from '@/ui/controls';
import { dayWord, fmtClock, fmtMins, greeting } from '@/ui/format';
import { success, tap } from '@/ui/haptics';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

export default function Today() {
  const router = useRouter();
  const { data, focus } = useStore();
  const now = useNow(15_000);
  const [toast, setToast] = useState<string | null>(null);
  if (!data) return null;

  const avail = availableMins(data);
  const reserved = reservedMins(data);
  const next = nextOpenSlot(data);
  const nextHabit = next ? data.habits.find((h) => h.id === next.habitId) : undefined;
  const hint = todayHint(data, now);
  const day = summarizeDay(data, now);
  const grind = data.habits.filter((h) => h.type === 'grind');
  const todayLog = getLog(data, dateToStr(now));
  const focusHabit = focus ? data.habits.find((h) => h.id === focus.habitId) : undefined;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const firstTask = summarizeDay(data, yesterday).tomorrowFirst;
  const checkin = dueCheckin(data, now);
  const streak = getSoftStreak(data, now);
  const goal = data.profile.weeklySlotGoal;
  const week = getLast7Days(data, now);

  function addCount(h: HabitItem) {
    tap();
    const r = logGrind(data as UserData, h.id, 1, new Date());
    if (!r) return;
    updateData(() => r.data);
    success();
    setToast(`+${Math.round(r.earned)} min of rest`);
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="small">{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</AppText>
          <AppText variant="title">{greeting(now)}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} hitSlop={10}>
          <AppText variant="small" color={colors.text}>
            Settings
          </AppText>
        </Pressable>
      </View>

      <Card style={styles.bank}>
        <AppText variant="label">Rest you can book</AppText>
        <AppText variant="display" color={avail < 0 ? colors.danger : colors.text}>
          {fmtMins(avail)}
        </AppText>
        <AppText variant="small">
          {reserved > 0 ? `${fmtMins(reserved)} is held for booked rest. ` : ''}
          {isRestDay(data, now) ? 'Rest day: rest costs half.' : `Today earned ${fmtMins(day.earned)}, spent ${fmtMins(day.spent)}.`}
        </AppText>
        <AppText variant="body" style={styles.hint}>
          {hint.text}
        </AppText>
        {hint.kind === 'close' ? (
          <Button title="Close the day" onPress={() => router.push('/close-day')} />
        ) : (
          <Button title="Book rest" accent={colors.glow} onPress={() => router.push('/book')} />
        )}
      </Card>

      {checkin ? (
        <Card onPress={() => router.push('/checkin')}>
          <AppText variant="label">Day {checkin} check-in</AppText>
          <AppText variant="body">Is the same thing still the hardest? Two minutes to tune your plan.</AppText>
        </Card>
      ) : null}

      {firstTask ? (
        <Card>
          <AppText variant="label">You left yourself a note</AppText>
          <AppText variant="body">{firstTask}</AppText>
        </Card>
      ) : null}

      {next && nextHabit ? (
        <Card onPress={() => router.push({ pathname: '/slot/[id]', params: { id: next.id } })} selected tint={colors.glow}>
          <AppText variant="label">{next.state === 'active' ? 'Resting now' : 'Next rest'}</AppText>
          <AppText variant="heading">
            {nextHabit.emoji} {nextHabit.name}
          </AppText>
          <AppText variant="small">
            {dayWord(new Date(next.startsAt), now)} {fmtClock(new Date(next.startsAt))}, {next.plannedMins} min
          </AppText>
        </Card>
      ) : null}

      {focus && focusHabit ? (
        <Card onPress={() => router.push({ pathname: '/focus', params: { habitId: focus.habitId } })} selected tint={colors.grind}>
          <AppText variant="label">Focus running</AppText>
          <AppText variant="heading">
            {focusHabit.emoji} {focusHabit.name}
          </AppText>
          <AppText variant="small">Tap to open the timer.</AppText>
        </Card>
      ) : null}

      <View style={styles.section}>
        <AppText variant="label">Work</AppText>
        <Card>
          {grind.map((h, i) => {
            const logged = todayLog?.grindLogs.find((l) => l.habitId === h.id)?.value ?? 0;
            return (
              <View key={h.id}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.item}>
                  <View style={styles.flex}>
                    <AppText variant="body">
                      {h.emoji} {h.name}
                    </AppText>
                    <AppText variant="small">
                      {h.valueType === 'duration'
                        ? `${fmtMins(logged)} today, ${Math.round((h.earnRate ?? 0) * 60)} min rest per hour`
                        : `${logged} today, ${Math.round(h.earnRate ?? 0)} min rest each`}
                    </AppText>
                  </View>
                  {h.valueType === 'duration' ? (
                    <Button
                      small
                      kind="secondary"
                      title={focus?.habitId === h.id ? 'Open' : 'Start'}
                      onPress={() => router.push({ pathname: '/focus', params: { habitId: h.id } })}
                    />
                  ) : (
                    <Button small kind="secondary" title="+1" onPress={() => addCount(h)} />
                  )}
                </View>
              </View>
            );
          })}
        </Card>
        {toast ? (
          <AppText variant="small" color={colors.good}>
            {toast}
          </AppText>
        ) : null}
      </View>

      <View style={styles.section}>
        <AppText variant="label">This week</AppText>
        <Card>
          <View style={styles.bars}>
            {week.map((d) => (
              <View key={d.date} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${Math.max(4, Math.min(100, d.score))}%` }, d.score === 0 ? styles.barEmpty : null]} />
                </View>
                <AppText variant="small">{new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</AppText>
              </View>
            ))}
          </View>
          <AppText variant="small">
            {streak > 0 ? `${streak} good ${streak === 1 ? 'day' : 'days'} in a row. A missed day does not reset it, two in a row do.` : 'No pressure. Good days add up here.'}
          </AppText>
          {goal > 0 ? (
            <AppText variant="small">
              Rest taken on purpose: {Math.min(doneSlotsLast7(data, now), 99)} of {goal} this week.
            </AppText>
          ) : null}
        </Card>
      </View>

      {hint.kind !== 'close' && !day.closed ? <Button kind="ghost" title="Close the day" onPress={() => router.push('/close-day')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  flex: { flex: 1 },
  bank: { gap: space.sm, padding: space.xl },
  hint: { marginTop: space.xs, marginBottom: space.sm },
  section: { gap: space.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  bars: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, height: 80, marginBottom: space.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: colors.surfaceHigh, borderRadius: radius.sm, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: colors.good },
  barEmpty: { backgroundColor: colors.border },
});
