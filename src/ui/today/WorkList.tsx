import { StyleSheet, View } from 'react-native';
import { HabitItem } from '@/core';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider } from '@/ui/controls';
import { fmtMins } from '@/ui/format';
import { AppText } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

interface Props {
  habits: HabitItem[];
  loggedToday: (habitId: string) => number;
  runningHabitId?: string; // the habit with a focus timer going
  toast: { text: string } | null;
  onStart: (h: HabitItem) => void;
  onAdd: (h: HabitItem) => void;
  onUndo: () => void;
  onManage: () => void; // opens the activities screen
}

export function WorkList({ habits, loggedToday, runningHabitId, toast, onStart, onAdd, onUndo, onManage }: Props) {
  return (
    <View style={styles.section}>
      <AppText variant="label">Work</AppText>
      <Card>
        {habits.length === 0 ? (
          <View style={styles.empty}>
            <AppText variant="small">No work activities yet. Add one and its time starts earning rest.</AppText>
            <TextButton title="Add an activity" onPress={onManage} />
          </View>
        ) : null}
        {habits.map((h, i) => {
          const logged = loggedToday(h.id);
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
                  <Button small kind="secondary" title={runningHabitId === h.id ? 'Open' : 'Start'} onPress={() => onStart(h)} />
                ) : (
                  <Button small kind="secondary" title="+1" onPress={() => onAdd(h)} />
                )}
              </View>
            </View>
          );
        })}
      </Card>
      {toast ? (
        <View style={styles.toast}>
          <AppText variant="small" color={colors.goodText}>
            {toast.text}
          </AppText>
          <TextButton title="Undo" onPress={onUndo} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  flex: { flex: 1 },
  empty: { gap: space.sm, paddingVertical: space.sm, alignItems: 'flex-start' },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
});
