import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HabitItem, HabitResult, UserData, activeHabits, addCustomHabit, archiveHabit, habitWorth, setHabitWorth } from '@/core';
import { updateData, useStore } from '@/state/store';
import { colors, space } from '@/theme';
import { AddActivity } from '@/ui/AddActivity';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Stepper } from '@/ui/controls';
import { ModalHeader } from '@/ui/ModalHeader';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

function worthLabel(h: HabitItem): string {
  if (h.type === 'glow') return 'Bank cost per hour';
  return h.valueType === 'duration' ? 'Rest earned per hour' : 'Rest earned each time';
}

export default function Activities() {
  const { data } = useStore();
  const [armed, setArmed] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!data) return null;

  const run = (fn: (d: UserData) => HabitResult) => {
    const r = fn(data);
    if (!r.ok) {
      setMessage(
        r.error === 'last_of_kind'
          ? 'Keep at least one activity of each kind.'
          : r.error === 'duplicate_name'
            ? 'You already have one with that name.'
            : r.error === 'empty_name'
              ? 'Give it a name first.'
              : 'That activity is gone.',
      );
      return false;
    }
    setMessage(null);
    updateData(() => r.data);
    return true;
  };

  return (
    <Screen>
      <ModalHeader title="Activities" action="Done" />
      <AppText variant="small">
        Past days keep their numbers when you change or remove something. New values apply to what you log from now on.
      </AppText>
      {message ? (
        <AppText variant="small" color={colors.danger}>
          {message}
        </AppText>
      ) : null}

      {(['grind', 'glow'] as const).map((type) => (
        <View key={type} style={styles.section}>
          <AppText variant="label">{type === 'grind' ? 'Work' : 'Rest'}</AppText>
          <Card style={styles.group}>
            {activeHabits(data, type).map((h, i) => {
              const step = 5;
              const worth = Math.round(habitWorth(h));
              return (
                <View key={h.id} style={styles.item}>
                  {i > 0 ? <Divider /> : null}
                  <AppText variant="heading">
                    {h.emoji} {h.name}
                  </AppText>
                  <Stepper
                    label={worthLabel(h)}
                    value={`${worth} min`}
                    onMinus={() => run((d) => setHabitWorth(d, h.id, worth - step))}
                    onPlus={() => run((d) => setHabitWorth(d, h.id, worth + step))}
                    minusDisabled={worth <= 0}
                  />
                  <Button
                    small
                    kind={armed === h.id ? 'danger' : 'ghost'}
                    title={armed === h.id ? 'Tap again to remove' : 'Remove'}
                    onPress={() => {
                      if (armed !== h.id) return setArmed(h.id);
                      setArmed(null);
                      run((d) => archiveHabit(d, h.id));
                    }}
                  />
                </View>
              );
            })}
          </Card>
          <AddActivity
            placeholder={type === 'grind' ? 'New work activity' : 'New way to rest'}
            onAdd={(name, emoji) => run((d) => addCustomHabit(d, { type, name, emoji }))}
          />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  group: { gap: space.sm },
  item: { gap: space.sm },
});
