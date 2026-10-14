import { StyleSheet, View } from 'react-native';
import { getLast7Days } from '@/core';
import { colors, radius, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { AppText } from '@/ui/Text';

interface Props {
  week: ReturnType<typeof getLast7Days>;
  streak: number;
  goal: number; // weekly rest-slot goal, 0 = none
  doneSlots: number;
  onHistory: () => void;
}

export function WeekCard({ week, streak, goal, doneSlots, onHistory }: Props) {
  return (
    <Card>
      <View style={styles.bars}>
        {week.map((d) => (
          <View key={d.date} style={styles.col}>
            <View style={styles.track}>
              <View style={[styles.bar, { height: `${Math.max(4, Math.min(100, d.score))}%` }, d.score === 0 ? styles.empty : null]} />
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
          Rest taken on purpose: {Math.min(doneSlots, 99)} of {goal} this week.
        </AppText>
      ) : null}
      <Button small kind="ghost" title="History" style={styles.history} onPress={onHistory} />
    </Card>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm, height: 80, marginBottom: space.sm },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  track: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: colors.surfaceHigh, borderRadius: radius.sm, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: colors.good },
  empty: { backgroundColor: colors.border },
  history: { alignSelf: 'flex-start', marginTop: space.sm },
});
