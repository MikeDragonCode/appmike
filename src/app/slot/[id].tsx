import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { COMPLETE_THRESHOLD, FinishOutcome, addMinutes } from '@/core';
import { BOOK_ERRORS, beginSlot, endSlot, extendRunningSlot, moveSlot } from '@/state/actions';
import { useStore } from '@/state/store';
import { useNow } from '@/hooks/useNow';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Stepper } from '@/ui/controls';
import { Card } from '@/ui/Card';
import { dayWord, fmtClock, fmtMins, fmtTimer } from '@/ui/format';
import { success, tap } from '@/ui/haptics';
import { ModalHeader } from '@/ui/ModalHeader';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

export default function SlotScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const now = useNow(1000);
  const [outcome, setOutcome] = useState<FinishOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [extendNote, setExtendNote] = useState<string | null>(null);
  const [moving, setMoving] = useState<Date | null>(null); // new start while the time is being changed
  const buzzed = useRef(false);

  const slot = data?.slots.find((s) => s.id === id);
  const habit = slot && data?.habits.find((h) => h.id === slot.habitId);

  const plannedMs = slot ? slot.plannedMins * 60_000 : 0;
  const elapsedMs = slot?.startedAt ? now.getTime() - new Date(slot.startedAt).getTime() : 0;
  const over = slot?.state === 'active' && elapsedMs >= plannedMs;

  useEffect(() => {
    if (over && !buzzed.current) {
      buzzed.current = true;
      success();
    }
    if (!over) buzzed.current = false;
  }, [over]);

  if (!data || !slot || !habit) {
    return (
      <Screen padTop={false}>
        <ModalHeader title="Rest" />
        <AppText variant="small">This slot is not available any more.</AppText>
      </Screen>
    );
  }

  async function finish(actualMins: number) {
    if (busy) return;
    setBusy(true);
    const o = await endSlot(slot!.id, actualMins);
    setBusy(false);
    if (o) {
      if (o.state === 'done') success();
      setOutcome(o);
    }
  }

  // A closed slot (just finished here, or opened later from a note)
  if (outcome || (slot.state !== 'planned' && slot.state !== 'active')) {
    const msg = outcome?.message ?? closedMessage(slot.state, slot.actualMins ?? 0, slot.plannedMins);
    return (
      <Screen padTop={false} footer={<Button title="Done" onPress={() => router.back()} />}>
        <ModalHeader title="Rest" onClose={() => router.back()} />
        <Card>
          <AppText variant="heading">
            {habit.emoji} {habit.name}
          </AppText>
          <AppText variant="body" style={styles.msg}>
            {msg}
          </AppText>
        </Card>
      </Screen>
    );
  }

  const startsAt = new Date(slot.startsAt);
  const minsUsed = Math.min(slot.plannedMins, Math.round(elapsedMs / 60_000));
  const earlyNote =
    slot.state === 'active' && minsUsed < Math.ceil(slot.plannedMins * COMPLETE_THRESHOLD)
      ? `Finishing now counts as ${minsUsed} of ${slot.plannedMins} min. The unused time goes back to your bank.`
      : null;

  return (
    <Screen
      padTop={false}
      footer={
        slot.state === 'planned' ? (
          <>
            {extendNote ? (
              <AppText variant="small" color={colors.danger}>
                {extendNote}
              </AppText>
            ) : null}
            <Button
              title="Start now"
              accent={colors.glow}
              busy={busy}
              onPress={async () => {
                tap();
                setBusy(true);
                await beginSlot(slot.id);
                setBusy(false);
              }}
            />
            {moving ? (
              <Button
                kind="secondary"
                title="Move it here"
                busy={busy}
                onPress={async () => {
                  setBusy(true);
                  const r = await moveSlot(slot.id, moving);
                  setBusy(false);
                  if (r.ok) {
                    setMoving(null);
                    setExtendNote(null);
                  } else setExtendNote(BOOK_ERRORS[r.error](r.shortBy, data.profile.bedtime));
                }}
              />
            ) : (
              <Button kind="secondary" title="Change time" onPress={() => setMoving(new Date(slot.startsAt))} />
            )}
            <Button
              kind={confirmCancel ? 'danger' : 'ghost'}
              title={confirmCancel ? 'Tap again to cancel this slot' : 'Cancel this slot'}
              onPress={() => (confirmCancel ? finish(0) : setConfirmCancel(true))}
            />
          </>
        ) : (
          <>
            {extendNote ? (
              <AppText variant="small" color={colors.danger}>
                {extendNote}
              </AppText>
            ) : null}
            <Button
              title={over ? 'Finish' : 'Finish early'}
              accent={colors.glow}
              busy={busy}
              onPress={() => finish(over ? slot.plannedMins : minsUsed)}
            />
            <Button
              kind="secondary"
              title="Add 15 min"
              onPress={async () => {
                tap();
                const r = await extendRunningSlot(slot.id, 15);
                setExtendNote(r.ok ? null : BOOK_ERRORS[r.error](r.shortBy, data.profile.bedtime));
              }}
            />
          </>
        )
      }
    >
      <ModalHeader title={slot.state === 'active' ? 'Resting' : 'Booked rest'} onClose={() => router.back()} />
      <View style={styles.center}>
        <AppText variant="heading">
          {habit.emoji} {habit.name}
        </AppText>
        {slot.state === 'active' ? (
          <>
            <AppText variant="display" style={styles.timer} color={over ? colors.good : colors.text}>
              {over ? 'Time is up' : fmtTimer((plannedMs - elapsedMs) / 1000)}
            </AppText>
            <AppText variant="small">
              {over ? 'This slot is full. Finish it, or add time.' : `${slot.plannedMins} min slot, ${fmtMins(minsUsed)} used`}
            </AppText>
            {earlyNote ? (
              <AppText variant="small" center>
                {earlyNote}
              </AppText>
            ) : null}
          </>
        ) : (
          <>
            <AppText variant="display" style={styles.timer}>
              {fmtClock(startsAt)}
            </AppText>
            <AppText variant="small">
              {dayWord(startsAt, now)}, {slot.plannedMins} min. {fmtMins(slot.reservedCost)} of rest is held for it.
            </AppText>
            {moving ? (
              <View style={styles.moving}>
                <Stepper
                  label={dayWord(moving, now)}
                  value={fmtClock(moving)}
                  onMinus={() => setMoving(addMinutes(moving, -15))}
                  onPlus={() => setMoving(addMinutes(moving, 15))}
                />
              </View>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function closedMessage(state: string, actual: number, planned: number): string {
  if (state === 'done') return `Rest taken: ${actual} min. Well spent.`;
  if (state === 'partial') return `Used ${actual} of ${planned} min. The rest went back to your bank.`;
  return 'Skipped. The time went back to your bank.';
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  timer: { fontSize: 56, fontVariant: ['tabular-nums'] },
  msg: { marginTop: space.sm },
  moving: { alignSelf: 'stretch', marginTop: space.lg },
});
