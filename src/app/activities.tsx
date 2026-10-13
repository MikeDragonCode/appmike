import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { HabitItem, HabitResult, UserData, activeHabits, addCustomHabit, archiveHabit, habitWorth, setHabitWorth } from '@/core';
import { updateData, useStore } from '@/state/store';
import { colors, radius, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Divider, Stepper } from '@/ui/controls';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

function worthLabel(h: HabitItem): string {
  if (h.type === 'glow') return 'Bank cost per hour';
  return h.valueType === 'duration' ? 'Rest earned per hour' : 'Rest earned each time';
}

export default function Activities() {
  const router = useRouter();
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
      <View style={styles.header}>
        <AppText variant="title" style={styles.flex}>
          Activities
        </AppText>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <AppText variant="small" color={colors.text}>
            Done
          </AppText>
        </Pressable>
      </View>
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
          <AddRow
            placeholder={type === 'grind' ? 'New work activity' : 'New way to rest'}
            onAdd={(name, emoji) => run((d) => addCustomHabit(d, { type, name, emoji }))}
          />
        </View>
      ))}
    </Screen>
  );
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string, emoji: string) => boolean }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const submit = () => {
    if (!name.trim()) return;
    if (onAdd(name, emoji)) {
      setName('');
      setEmoji('');
    }
  };
  return (
    <View style={styles.add}>
      <TextInput
        value={emoji}
        onChangeText={(t) => setEmoji(Array.from(t).slice(0, 2).join(''))}
        placeholder="🙂"
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.emoji]}
        accessibilityLabel="Emoji"
      />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.name]}
        maxLength={30}
        returnKeyType="done"
        onSubmitEditing={submit}
        accessibilityLabel={placeholder}
      />
      <Pressable accessibilityRole="button" onPress={submit} style={[styles.addBtn, !name.trim() ? styles.addOff : null]}>
        <AppText variant="body" color={colors.onAccent} style={styles.addText}>
          Add
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  section: { gap: space.sm },
  group: { gap: space.sm },
  item: { gap: space.sm },
  add: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: {
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  emoji: { width: 56, textAlign: 'center' },
  name: { flex: 1, minWidth: 0 },
  addBtn: { height: 48, paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: colors.text, justifyContent: 'center' },
  addOff: { opacity: 0.35 },
  addText: { fontWeight: '600' },
});
