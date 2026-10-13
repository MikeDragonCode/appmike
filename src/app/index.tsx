import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  HabitItem,
  MIN_SLOT_MINS,
  UserData,
  activeHabits,
  availableMins,
  dateToStr,
  doneSlotsLast7,
  dismissRecap,
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
  weeklyRecap,
} from '@/core';
import { undo } from '@/state/actions';
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
  const [toast, setToast] = useState<{ text: string; habitId: string } | null>(null);
  if (!data) return null;

  const avail = availableMins(data);
  const reserved = reservedMins(data);
  const next = nextOpenSlot(data);
  const nextHabit = next ? data.habits.find((h) => h.id === next.habitId) : undefined;
  const hint = todayHint(data, now);
  const day = summarizeDay(data, now);
  const grind = activeHabits(data, 'grind');
  const firstFocus = grind.find((h) => h.valueType === 'duration');
  const todayLog = getLog(data, dateToStr(now));
  const focusHabit = focus ? data.habits.find((h) => h.id === focus.habitId) : undefined;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const firstTask = summarizeDay(data, yesterday).tomorrowFirst;
  const checkin = dueCheckin(data, now);
  const recap = weeklyRecap(data, now);
  const streak = getSoftStreak(data, now);
  const goal = data.profile.weeklySlotGoal;
  const week = getLast7Days(data, now);

  function addCount(h: HabitItem) {
    tap();
    const r = logGrind(data as UserData, h.id, 1, new Date());
    if (!r) return;
    updateData(() => r.data);
    success();
    setToast({ text: `+${Math.round(r.earned)} min of rest`, habitId: h.id });
    setTimeout(() => setToast((t) => (t?.habitId === h.id ? null : t)), 6000);
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
          <>
            <Button title="Close the day" onPress={() => router.push('/close-day')} />
            {avail >= MIN_SLOT_MINS ? (
              <Button kind="secondary" title="Book rest" onPress={() => router.push('/book')} />
            ) : null}
          </>
        ) : avail < data.profile.defaultSlotMins && firstFocus ? (
          <Button
            title={`Start ${firstFocus.name}`}
            accent={colors.grind}
            onPress={() => router.push({ pathname: '/focus', params: { habitId: firstFocus.id } })}
          />
        ) : (
          <Button title="Book rest" accent={colors.glow} onPress={() => router.push('/book')} />
        )}
        <Button small kind="ghost" title="Log rest I already took" onPress={() => router.push('/log-rest')} />
      </Card>

      {checkin ? (
        <Card onPress={() => router.push('/checkin')}>
          <AppText variant="label">Day {checkin} check-in</AppText>
          <AppText variant="body">Is the same thing still the hardest? Two minutes to tune your plan.</AppText>
        </Card>
      ) : null}

      {recap ? (
        <Card>
          <AppText variant="label">Your week</AppText>
          <AppText variant="body">
            You worked {fmtMins(recap.workMins)} and rested {fmtMins(recap.restMins)}.
          </AppText>
          {recap.restSlots > 0 ? (
            <AppText variant="small">
              {recap.restSlots} rest {recap.restSlots === 1 ? 'slot' : 'slots'} taken on purpose.
            </AppText>
          ) : null}
          {recap.goodDays > 0 ? (
            <AppText variant="small">
              {recap.goodDays} good {recap.goodDays === 1 ? 'day' : 'days'}.
            </AppText>
          ) : null}
          {recap.slotGoal > 0 ? (
            <AppText variant="small">
              {recap.restSlots >= recap.slotGoal ? 'Weekly rest goal reached.' : `The goal was ${recap.slotGoal}. A new week starts now.`}
            </AppText>
          ) : null}
          <Button small kind="secondary" title="Got it" style={styles.recapBtn} onPress={() => updateData((d) => dismissRecap(d, new Date()))} />
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
          <View style={styles.toast}>
            <AppText variant="small" color={colors.good}>
              {toast.text}
            </AppText>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => {
                undo('work', toast.habitId, 1);
                setToast(null);
              }}
            >
              <AppText variant="small" color={colors.text}>
                Undo
              </AppText>
            </Pressable>
          </View>
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
          <Button small kind="ghost" title="History" style={styles.recapBtn} onPress={() => router.push('/history')} />
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
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  recapBtn: { alignSelf: 'flex-start', marginTop: space.sm },
  section: { gap: space.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  bars: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, height: 80, marginBottom: space.sm },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: colors.surfaceHigh, borderRadius: radius.sm, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: colors.good },
  barEmpty: { backgroundColor: colors.border },
});
