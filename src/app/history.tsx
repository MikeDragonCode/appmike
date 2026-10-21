import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HistoryDay, activeHabits, allMoments, bestWindow, listDays, setLogEntry } from '@/core';
import { updateData, useStore } from '@/state/store';
import { colors, radius, space } from '@/theme';
import { Card } from '@/ui/Card';
import { Chip, Row, Stepper } from '@/ui/controls';
import { dayWord, fmtMins } from '@/ui/format';
import { tap } from '@/ui/haptics';
import { ModalHeader } from '@/ui/ModalHeader';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

export default function History() {
  const { data } = useStore();
  const [adding, setAdding] = useState<string | null>(null); // date whose picker is open
  if (!data) return null;
  const days = listDays(data, 30);
  const now = new Date();
  const window = bestWindow(data);
  const moments = allMoments(data);
  const got = moments.filter((m) => m.earned).length;

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

      <Card>
        <AppText variant="label">
          Moments, {got} of {moments.length}
        </AppText>
        <View style={styles.moments}>
          {moments.map((m) => (
            <View
              key={m.id}
              style={[styles.moment, m.earned ? null : styles.locked]}
              accessible
              accessibilityLabel={m.earned ? `${m.title}. ${m.line}` : 'Not yet'}
            >
              <AppText variant="display" color={m.earned ? undefined : colors.border} style={styles.momentEmoji}>
                {m.earned ? m.emoji : '·'}
              </AppText>
              <AppText variant="small" numberOfLines={2} style={styles.momentTitle}>
                {m.earned ? m.title : 'Not yet'}
              </AppText>
            </View>
          ))}
        </View>
        <AppText variant="small">They only ever get added. Nothing here resets.</AppText>
      </Card>

      {window ? (
        <Card>
          <AppText variant="label">Your rhythm</AppText>
          <AppText variant="body">
            Your focus time gathers between {hh(window.from)} and {hh(window.to)}: {Math.round(window.share * 100)}% of the timed
            work so far.
          </AppText>
          <AppText variant="small">Counted on this phone only, from the timer. Good hours to protect.</AppText>
        </Card>
      ) : null}

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
  moments: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginVertical: space.sm },
  moment: { width: '31%', alignItems: 'center', gap: 2, paddingVertical: space.sm, paddingHorizontal: 4, borderRadius: radius.sm, backgroundColor: colors.surfaceHigh },
  locked: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  momentEmoji: { fontSize: 30, lineHeight: 38, letterSpacing: 0 },
  momentTitle: { textAlign: 'center' },
});
