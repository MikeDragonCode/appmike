import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { activeHabits, glowCost, isRestDay } from '@/core';
import { logRestNow, undo } from '@/state/actions';
import { useStore } from '@/state/store';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip, Row, Stepper } from '@/ui/controls';
import { fmtMins } from '@/ui/format';
import { success, tap } from '@/ui/haptics';
import { ModalHeader } from '@/ui/ModalHeader';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

const LENGTHS = [10, 20, 30, 60];

// For rest that already happened without being booked. It is recorded honestly:
// the time comes out of the bank, even if that leaves it below zero.
export default function LogRest() {
  const router = useRouter();
  const { data } = useStore();
  const rest = data ? activeHabits(data, 'glow').filter((h) => h.valueType === 'duration') : [];
  const [habitId, setHabitId] = useState(rest[0]?.id ?? '');
  const [mins, setMins] = useState(20);
  const [done, setDone] = useState<{ habitId: string; mins: number; charged: number } | null>(null);
  if (!data) return null;
  const habit = rest.find((h) => h.id === habitId);
  const cost = habit ? glowCost(habit, mins, isRestDay(data, new Date())) : 0;

  if (done) {
    const h = data.habits.find((x) => x.id === done.habitId);
    return (
      <Screen
        padTop={false}
        footer={
          <>
            <Button title="Done" onPress={() => router.back()} />
            <Button
              kind="ghost"
              title="Undo this entry"
              onPress={() => {
                undo('rest', done.habitId, done.mins);
                router.back();
              }}
            />
          </>
        }
      >
        <ModalHeader title="Logged" onClose={() => router.back()} />
        <Card>
          <AppText variant="heading">
            {h?.name}, {fmtMins(done.mins)}
          </AppText>
          <AppText variant="body">{fmtMins(done.charged)} came out of your bank.</AppText>
          <AppText variant="small">Next time you can book it first. Either way, it is now on record.</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      padTop={false}
      footer={
        <Button
          title="Log rest"
         
          disabled={!habit}
          onPress={() => {
            tap();
            const charged = logRestNow(habitId, mins);
            if (charged === null) return;
            success();
            setDone({ habitId, mins, charged });
          }}
        />
      }
    >
      <ModalHeader title="Log rest" />
      <AppText variant="small">Took a break without booking it? Record it, so your bank stays true.</AppText>
      <AppText variant="label">What</AppText>
      <Row>
        {rest.map((h) => (
          <Chip key={h.id} label={`${h.name}`} tint={colors.glow} selected={h.id === habitId} onPress={() => setHabitId(h.id)} />
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
        onMinus={() => setMins(Math.max(5, mins - 5))}
        onPlus={() => setMins(Math.min(480, mins + 5))}
        minusDisabled={mins <= 5}
      />
      <View style={{ gap: space.xs }}>
        <Card>
          <AppText variant="small">Comes out of your bank</AppText>
          <AppText variant="heading">{fmtMins(cost)}</AppText>
        </Card>
      </View>
    </Screen>
  );
}
