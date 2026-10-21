import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  HabitItem,
  MIN_SLOT_MINS,
  UserData,
  activeHabits,
  availableMins,
  currentWeek,
  dateToStr,
  doneSlotsThisWeek,
  restPace,
  dismissRecap,
  dueCheckin,
  getLog,
  getSoftStreak,
  isRestDay,
  logGrind,
  newMoments,
  nextOpenSlot,
  reservedMins,
  seeMoment,
  summarizeDay,
  todayHint,
  weeklyRecap,
} from '@/core';
import { undo } from '@/state/actions';
import { updateData, useStore } from '@/state/store';
import { useNow } from '@/hooks/useNow';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { NewMoment } from '@/ui/NewMoment';
import { dayWord, fmtClock, fmtMins, greeting } from '@/ui/format';
import { success, tap } from '@/ui/haptics';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';
import { RecapCard } from '@/ui/today/RecapCard';
import { WeekCard } from '@/ui/today/WeekCard';
import { WorkList } from '@/ui/today/WorkList';

export default function Today() {
  const router = useRouter();
  const { data, focus, saveFailed } = useStore();
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
  const moments = newMoments(data);
  const streak = getSoftStreak(data, now);
  const goal = data.profile.weeklySlotGoal;
  const week = currentWeek(data, now);
  // Once the day is closed the main action stays available but stops calling out for attention.
  const mainKind = hint.kind === 'closed' ? 'secondary' : 'primary';

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
        <TextButton title="Settings" onPress={() => router.push('/settings')} />
      </View>

      {saveFailed ? (
        <Card selected tint={colors.grind}>
          <AppText variant="label">Not saved</AppText>
          <AppText variant="small">
            Your latest changes could not be saved on this phone. Free up some space and keep the app open. Use Backup in
            Settings to keep a copy.
          </AppText>
        </Card>
      ) : null}

      <Card hero style={styles.bank}>
        <AppText variant="label" color={colors.heroMuted}>Rest you can book</AppText>
        <AppText variant="display" color={colors.heroText} style={styles.bankNumber}>
          {fmtMins(avail)}
        </AppText>
        <AppText variant="small" color={colors.heroMuted}>
          {reserved > 0 ? `${fmtMins(reserved)} is held for booked rest. ` : ''}
          {isRestDay(data, now) ? 'Rest day: rest costs half.' : `Today earned ${fmtMins(day.earned)}, spent ${fmtMins(day.spent)}.`}
        </AppText>
        <AppText variant="body" color={colors.heroText} style={styles.hint}>
          {hint.text}
        </AppText>
        {hint.kind === 'close' ? (
          <>
            <Button onHero title="Close the day" onPress={() => router.push('/close-day')} />
            {avail >= MIN_SLOT_MINS ? (
              <Button onHero kind="secondary" title="Book rest" onPress={() => router.push('/book')} />
            ) : null}
          </>
        ) : avail < data.profile.defaultSlotMins && firstFocus ? (
          <Button
            onHero
            title={`Start ${firstFocus.name}`}
            kind={mainKind}
            accent={colors.grind}
            onPress={() => router.push({ pathname: '/focus', params: { habitId: firstFocus.id } })}
          />
        ) : (
          <Button onHero title="Book rest" kind={mainKind} onPress={() => router.push('/book')} />
        )}
        <Button onHero small kind="ghost" title="Log rest I already took" onPress={() => router.push('/log-rest')} />
        {hint.kind !== 'close' && !day.closed ? (
          <Button onHero small kind="ghost" title="Close the day" onPress={() => router.push('/close-day')} />
        ) : null}
      </Card>

      {moments.length > 0 ? (
        <NewMoment moment={moments[0]} more={moments.length - 1} onSeen={() => updateData((d) => seeMoment(d, moments[0].id))} />
      ) : null}

      {checkin ? (
        <Card onPress={() => router.push('/checkin')}>
          <AppText variant="label">Day {checkin} check-in</AppText>
          <AppText variant="body">Is the same thing still the hardest? Two minutes to tune your plan.</AppText>
        </Card>
      ) : null}

      {recap ? <RecapCard recap={recap} onDismiss={() => updateData((d) => dismissRecap(d, new Date()))} /> : null}

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
            {nextHabit.name}
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
            {focusHabit.name}
          </AppText>
          <AppText variant="small">Tap to open the timer.</AppText>
        </Card>
      ) : null}

      <WorkList
        habits={grind}
        loggedToday={(id) => todayLog?.grindLogs.find((l) => l.habitId === id)?.value ?? 0}
        runningHabitId={focus?.habitId}
        toast={toast}
        onStart={(h) => router.push({ pathname: '/focus', params: { habitId: h.id } })}
        onAdd={addCount}
        onManage={() => router.push('/activities')}
        onUndo={() => {
          if (!toast) return;
          undo('work', toast.habitId, 1);
          setToast(null);
        }}
      />

      <View style={styles.section}>
        <AppText variant="label">This week</AppText>
        <WeekCard week={week} streak={streak} goal={goal} doneSlots={doneSlotsThisWeek(data, now)} pace={restPace(data, now)} onHistory={() => router.push('/history')} />
      </View>

    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  flex: { flex: 1 },
  bank: { gap: space.sm, padding: space.xl, paddingVertical: space.xxl },
  bankNumber: { marginVertical: -4 },
  hint: { marginTop: space.xs, marginBottom: space.sm },
  section: { gap: space.sm },
});
