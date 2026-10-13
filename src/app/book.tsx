import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MIN_SLOT_MINS, addMinutes, availableMins, bookSlot, glowCost, isRestDay } from '@/core';
import { BOOK_ERRORS, book } from '@/state/actions';
import { useStore } from '@/state/store';
import { useNow } from '@/hooks/useNow';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip, Row, Stepper } from '@/ui/controls';
import { dayWord, fmtClock, fmtMins } from '@/ui/format';
import { tap } from '@/ui/haptics';
import { ModalHeader } from '@/ui/ModalHeader';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

const LENGTHS = [15, 30, 45, 60, 90];
const MAX_MINS = 240;

function nextQuarter(from: Date): Date {
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15);
  return d;
}

export default function BookRest() {
  const router = useRouter();
  const { data } = useStore();
  const now = useNow(15_000);
  const rest = data?.habits.filter((h) => h.type === 'glow' && h.valueType === 'duration') ?? [];
  const [habitId, setHabitId] = useState(rest[0]?.id ?? '');
  const [mins, setMins] = useState(data?.profile.defaultSlotMins ?? 60);
  const [startsAt, setStartsAt] = useState<Date | null>(null); // null = now
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (!data) return null;
  const habit = rest.find((h) => h.id === habitId);
  const start = startsAt ?? now;
  const preview = bookSlot(data, { id: 'preview', habitId, plannedMins: mins, startsAt: start, now });
  const cost = habit ? glowCost(habit, mins, isRestDay(data, start)) : 0;
  const avail = availableMins(data);
  const left = avail - cost;
  const end = addMinutes(start, mins);

  const problem = preview.ok
    ? null
    : BOOK_ERRORS[preview.error](preview.ok ? undefined : preview.shortBy, data.profile.bedtime);

  async function confirm() {
    if (busy || !preview.ok) return;
    setBusy(true);
    const r = await book({ habitId, plannedMins: mins, startsAt });
    if (!r.ok) {
      setServerError(BOOK_ERRORS[r.error](r.shortBy, data?.profile.bedtime));
      setBusy(false);
      return;
    }
    if (r.startedNow) router.replace({ pathname: '/slot/[id]', params: { id: r.slot.id } });
    else router.back();
  }

  const setOffset = (m: number) => {
    tap();
    setStartsAt(m === 0 ? null : nextQuarter(addMinutes(now, m - 1)));
  };
  const evening = new Date(now);
  evening.setHours(20, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  return (
    <Screen
      padTop={false}
      footer={
        <>
          {problem || serverError ? (
            <AppText variant="small" color={colors.danger}>
              {serverError ?? problem}
            </AppText>
          ) : null}
          <Button
            title={startsAt === null ? 'Start now' : 'Book it'}
            accent={colors.glow}
            onPress={confirm}
            disabled={!preview.ok || mins < MIN_SLOT_MINS}
            busy={busy}
          />
        </>
      }
    >
      <ModalHeader title="Book rest" />

      <AppText variant="label">What</AppText>
      <Row>
        {rest.map((h) => (
          <Chip
            key={h.id}
            label={`${h.emoji} ${h.name}`}
            tint={colors.glow}
            selected={h.id === habitId}
            onPress={() => {
              tap();
              setHabitId(h.id);
              setServerError(null);
            }}
          />
        ))}
      </Row>

      <AppText variant="label">How long</AppText>
      <Row>
        {LENGTHS.map((l) => (
          <Chip key={l} label={`${l} min`} tint={colors.glow} selected={mins === l} onPress={() => setMins(l)} />
        ))}
      </Row>
      <Stepper
        label="Fine tune"
        value={`${mins} min`}
        onMinus={() => setMins(Math.max(MIN_SLOT_MINS, mins - 5))}
        onPlus={() => setMins(Math.min(MAX_MINS, mins + 5))}
        minusDisabled={mins <= MIN_SLOT_MINS}
        plusDisabled={mins >= MAX_MINS}
      />

      <AppText variant="label">When</AppText>
      <Row>
        <Chip label="Now" tint={colors.glow} selected={startsAt === null} onPress={() => setOffset(0)} />
        <Chip label="In 30 min" tint={colors.glow} selected={false} onPress={() => setOffset(30)} />
        <Chip label="In 1 hour" tint={colors.glow} selected={false} onPress={() => setOffset(60)} />
        {evening.getTime() > now.getTime() ? (
          <Chip label="Tonight 20:00" tint={colors.glow} selected={false} onPress={() => { tap(); setStartsAt(evening); }} />
        ) : null}
        <Chip label="Tomorrow 09:00" tint={colors.glow} selected={false} onPress={() => { tap(); setStartsAt(tomorrow); }} />
      </Row>
      <Stepper
        label={startsAt === null ? 'Starts now' : dayWord(start, now)}
        value={startsAt === null ? fmtClock(now) : fmtClock(start)}
        onMinus={() => setStartsAt(addMinutes(startsAt ?? nextQuarter(now), -15))}
        onPlus={() => setStartsAt(addMinutes(startsAt ?? nextQuarter(now), 15))}
      />

      <Card>
        <View style={styles.sum}>
          <AppText variant="small">Slot</AppText>
          <AppText variant="body">
            {fmtClock(start)} to {fmtClock(end)}
          </AppText>
        </View>
        <View style={styles.sum}>
          <AppText variant="small">Costs</AppText>
          <AppText variant="body">{fmtMins(cost)} of rest</AppText>
        </View>
        <View style={styles.sum}>
          <AppText variant="small">Left after</AppText>
          <AppText variant="body" color={left < 0 ? colors.grind : colors.text}>
            {fmtMins(left)}
          </AppText>
        </View>
        {left < 0 && preview.ok ? (
          <AppText variant="small" color={colors.grind}>
            You would borrow {fmtMins(-left)} ahead. Work pays it back.
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sum: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.xs },
});
