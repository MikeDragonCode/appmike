import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { endFocus, logWork, startFocus, undo } from '@/state/actions';
import { useStore } from '@/state/store';
import { useNow } from '@/hooks/useNow';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip, Row, Stepper } from '@/ui/controls';
import { fmtMins, fmtTimer } from '@/ui/format';
import { success, tap } from '@/ui/haptics';
import { ModalHeader } from '@/ui/ModalHeader';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

function KeepAwake() {
  useKeepAwake();
  return null;
}

export default function Focus() {
  const router = useRouter();
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const { data, focus } = useStore();
  const now = useNow(1000);
  const [manual, setManual] = useState(30);
  const [goal, setGoal] = useState(0); // minutes, 0 = no goal
  const [result, setResult] = useState<{ minutes: number; earned: number } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const habit = data?.habits.find((h) => h.id === habitId && h.type === 'grind' && h.valueType === 'duration');
  if (!data || !habit) {
    return (
      <Screen padTop={false}>
        <ModalHeader title="Focus" />
        <AppText variant="small">This activity is not available.</AppText>
      </Screen>
    );
  }

  const running = focus?.habitId === habit.id ? focus : null;
  const otherRunning = focus && !running ? data.habits.find((h) => h.id === focus.habitId) : undefined;
  const rate = habit.earnRate ?? 0;

  function record(minutes: number, timed = false) {
    const earned = logWork(habit!.id, minutes, timed);
    if (earned === null) return false;
    success();
    setResult({ minutes, earned });
    return true;
  }

  if (result) {
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
                undo('work', habit.id, result.minutes);
                router.back();
              }}
            />
          </>
        }
      >
        <ModalHeader title="Nice work" onClose={() => router.back()} />
        <Card>
          <AppText variant="label">Rest earned</AppText>
          <AppText variant="display" color={colors.goodText}>
            +{fmtMins(result.earned)}
          </AppText>
          <AppText variant="small">
            {habit.emoji} {habit.name}, {fmtMins(result.minutes)}
          </AppText>
        </Card>
      </Screen>
    );
  }

  if (running) {
    const elapsedSec = Math.max(0, (now.getTime() - new Date(running.startedAt).getTime()) / 1000);
    const minutes = Math.round(elapsedSec / 60);
    return (
      <Screen
        padTop={false}
        footer={
          <>
            <Button
              title={minutes >= 1 ? 'Finish and log' : 'Stop (under a minute)'}
              accent={colors.grind}
              onPress={() => {
                tap();
                if (minutes >= 1 && record(minutes, true)) endFocus();
                else {
                  endFocus();
                  router.back();
                }
              }}
            />
            <Button
              kind={confirmDiscard ? 'danger' : 'ghost'}
              title={confirmDiscard ? 'Tap again to discard this session' : 'Discard'}
              onPress={() => {
                if (!confirmDiscard) return setConfirmDiscard(true);
                endFocus();
                router.back();
              }}
            />
          </>
        }
      >
        <KeepAwake />
        <ModalHeader title="Focus" onClose={() => router.back()} />
        <View style={styles.center}>
          <AppText variant="small">
            {habit.emoji} {habit.name}
          </AppText>
          <AppText variant="display" style={styles.timer}>
            {fmtTimer(elapsedSec)}
          </AppText>
          <AppText variant="body" color={colors.grindText}>
            +{fmtMins(Math.floor((elapsedSec / 60) * rate))} of rest so far
          </AppText>
          {running.goalMins ? (
            <AppText variant="small" color={minutes >= running.goalMins ? colors.goodText : undefined}>
              {minutes >= running.goalMins
                ? 'Goal reached. Keep going or finish when you like.'
                : `Goal ${fmtMins(running.goalMins)}, ${fmtMins(running.goalMins - minutes)} to go`}
            </AppText>
          ) : null}
          <AppText variant="small" center style={styles.note}>
            You can leave this screen. The timer keeps counting.
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      padTop={false}
      footer={
        <>
          <Button
            title="Start timer"
            accent={colors.grind}
            disabled={!!otherRunning}
            onPress={() => {
              tap();
              startFocus(habit.id, goal || undefined);
            }}
          />
          <Button kind="secondary" title={`Log ${fmtMins(manual)} I already did`} onPress={() => record(manual)} />
        </>
      }
    >
      <ModalHeader title="Focus" />
      <Card>
        <AppText variant="heading">
          {habit.emoji} {habit.name}
        </AppText>
        <AppText variant="small">Every hour here earns {Math.round(rate * 60)} min of rest.</AppText>
      </Card>
      {otherRunning ? (
        <AppText variant="small" color={colors.grindText}>
          {otherRunning.emoji} {otherRunning.name} is still running. Finish it first.
        </AppText>
      ) : null}
      <AppText variant="label">Goal</AppText>
      <Row>
        {[0, 25, 45, 60].map((m) => (
          <Chip key={m} label={m === 0 ? 'No goal' : `${m} min`} tint={colors.grind} selected={goal === m} onPress={() => setGoal(m)} />
        ))}
      </Row>
      <AppText variant="small">With a goal you get one quiet notification when time is up.</AppText>
      <Stepper
        label="Time already done"
        value={`${manual} min`}
        onMinus={() => setManual(Math.max(5, manual - 5))}
        onPlus={() => setManual(Math.min(600, manual + 5))}
        minusDisabled={manual <= 5}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  timer: { fontSize: 64, fontVariant: ['tabular-nums'] },
  note: { marginTop: space.lg },
});
