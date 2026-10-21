import { StyleSheet, View } from 'react-native';
import { RestPace, WeekDay } from '@/core';
import { colors, fonts, space } from '@/theme';
import { Card } from '@/ui/Card';
import { fmtMins } from '@/ui/format';
import { AppText } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

interface Props {
  week: WeekDay[]; // the calendar week, first day first
  streak: number;
  goal: number; // weekly rest-slot goal, 0 = none
  doneSlots: number; // rest slots completed this week
  pace: RestPace | null; // work against rest so far this week
  onHistory: () => void;
}

export function WeekCard({ week, streak, goal, doneSlots, pace, onHistory }: Props) {
  return (
    <Card>
      <View style={styles.bars}>
        {week.map((d) => (
          <View key={d.date} style={styles.col} accessibilityLabel={d.isToday ? 'Today' : undefined}>
            <View style={[styles.track, d.isToday ? styles.trackToday : null, d.isFuture ? styles.trackFuture : null]}>
              {d.isFuture ? null : (
                <View style={[styles.bar, { height: `${Math.max(4, Math.min(100, d.score))}%` }, d.score === 0 ? styles.empty : null]} />
              )}
            </View>
            <AppText variant="small" color={d.isToday ? colors.text : undefined} style={d.isToday ? styles.todayLabel : null} numberOfLines={1}>
              {new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="small">
        {streak > 0 ? `${streak} good ${streak === 1 ? 'day' : 'days'} in a row. A missed day does not reset it, two in a row do.` : 'No pressure. Good days add up here.'}
      </AppText>
      {pace ? (
        <AppText variant="small">
          {pace.kind === 'unused'
            ? `This week you earned ${fmtMins(pace.earned)} of rest and took ${fmtMins(pace.spent)}. Rest is part of the plan, book some.`
            : `Work and rest are in step this week: ${fmtMins(pace.earned)} earned, ${fmtMins(pace.spent)} taken.`}
        </AppText>
      ) : null}
      {goal > 0 ? (
        <AppText variant="small">
          Rest taken on purpose this week: {Math.min(doneSlots, 99)} of {goal}.
        </AppText>
      ) : null}
      <View style={styles.history}>
        <TextButton title="History" onPress={onHistory} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, height: 84, marginBottom: space.sm },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  track: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: colors.surfaceHigh, borderRadius: 8, overflow: 'hidden' },
  trackToday: { backgroundColor: colors.accentSoft },
  trackFuture: { backgroundColor: colors.surface },
  bar: { width: '100%', backgroundColor: colors.good },
  empty: { backgroundColor: colors.surfaceHigh },
  todayLabel: { fontFamily: fonts.medium },
  history: { alignSelf: 'flex-start', marginTop: space.sm },
});
