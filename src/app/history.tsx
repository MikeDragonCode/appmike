import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { HistoryDay, activeHabits, listDays, setLogEntry } from '@/core';
import { updateData, useStore } from '@/state/store';
import { colors, space } from '@/theme';
import { Card } from '@/ui/Card';
import { Chip, Row, Stepper } from '@/ui/controls';
import { dayWord, fmtMins } from '@/ui/format';
import { tap } from '@/ui/haptics';
import { ModalHeader } from '@/ui/ModalHeader';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

export default function History() {
  const { data } = useStore();
  const [adding, setAdding] = useState<string | null>(null); // date whose picker is open
  if (!data) return null;
  const days = listDays(data, 30);
  const now = new Date();

  const set = (date: string, habitId: string, value: number) =>
    updateData((d) => {
      const r = setLogEntry(d, new Date(), date, habitId, value);
      return r.ok ? r.data : d;
    });

  return (
    <Screen>
      <ModalHeader title="History" action="Done" />
      <AppText variant="small">
        Fix what you logged, or add something you forgot. Changes move your bank by the difference only.
      </AppText>

      {days.length === 0 ? (
        <Card>
          <AppText variant="body">Nothing here yet. Days appear once you log work or rest.</AppText>
        </Card>
      ) : null}

      {days.map((day) => (
        <DayCard
          key={day.date}
          day={day}
          now={now}
          adding={adding === day.date}
          onToggleAdd={() => setAdding(adding === day.date ? null : day.date)}
          onSet={(habitId, value) => set(day.date, habitId, value)}
          habits={activeHabits(data)}
        />
      ))}
    </Screen>
  );
}

function DayCard({
  day,
  now,
  adding,
  onToggleAdd,
  onSet,
  habits,
}: {
  day: HistoryDay;
  now: Date;
  adding: boolean;
  onToggleAdd: () => void;
  onSet: (habitId: string, value: number) => void;
  habits: ReturnType<typeof activeHabits>;
}) {
  const d = new Date(`${day.date}T12:00:00`);
  const present = new Set(day.entries.map((e) => e.habit.id));
  const addable = habits.filter((h) => !present.has(h.id) && (h.valueType === 'duration' || h.type === 'grind'));
  return (
    <Card style={styles.day}>
      <AppText variant="heading">
        {dayWord(d, now)}
        {day.restDay ? ', rest day' : ''}
      </AppText>
      <AppText variant="small">
        Work {fmtMins(day.workMins)}, rest {fmtMins(day.restMins)}
      </AppText>
      {day.tomorrowFirst ? <AppText variant="small">Note: {day.tomorrowFirst}</AppText> : null}
      {day.entries.map((e) => {
        const counter = e.habit.valueType === 'counter';
        const label = `${e.habit.emoji} ${e.habit.name}`;
        return (
          <Stepper
            key={`${e.kind}-${e.habit.id}`}
            label={label}
            value={counter ? `x${e.value}` : fmtMins(e.value)}
            onMinus={() => onSet(e.habit.id, Math.max(0, e.value - (counter ? 1 : 5)))}
            onPlus={() => onSet(e.habit.id, e.value + (counter ? 1 : 5))}
          />
        );
      })}
      <TextButton title={adding ? 'Hide' : 'Add an entry'} onPress={onToggleAdd} />
      {adding ? (
        <Row>
          {addable.map((h) => (
            <Chip
              key={h.id}
              label={`${h.emoji} ${h.name}`}
              tint={h.type === 'grind' ? colors.grind : colors.glow}
              selected={false}
              onPress={() => {
                tap();
                onSet(h.id, h.valueType === 'counter' ? 1 : 30);
              }}
            />
          ))}
        </Row>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  day: { gap: space.md },
});
