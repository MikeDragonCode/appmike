import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { closeDay, summarizeDay } from '@/core';
import { updateData, useStore } from '@/state/store';
import { colors, radius, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { fmtMins } from '@/ui/format';
import { success } from '@/ui/haptics';
import { ModalHeader } from '@/ui/ModalHeader';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

export default function CloseDay() {
  const router = useRouter();
  const { data } = useStore();
  const today = new Date();
  const summary = data ? summarizeDay(data, today) : null;
  const [note, setNote] = useState(summary?.tomorrowFirst ?? '');
  const [saved, setSaved] = useState(false);
  if (!data || !summary) return null;

  if (saved) {
    return (
      <Screen padTop={false} footer={<Button title="Done" onPress={() => router.back()} />}>
        <ModalHeader title="Day closed" onClose={() => router.back()} />
        <Card>
          <AppText variant="body">Nothing left to carry tonight. 🌙</AppText>
          {note.trim() ? (
            <AppText variant="small">Tomorrow you start with: {note.trim()}</AppText>
          ) : null}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      padTop={false}
      footer={
        <Button
          title="Close the day"
          onPress={() => {
            updateData((d) => closeDay(d, new Date(), note));
            success();
            setSaved(true);
          }}
        />
      }
    >
      <ModalHeader title="Close the day" />
      <Card>
        <Line label="Work" value={fmtMins(summary.workMins)} />
        <Line label="Rest earned" value={fmtMins(summary.earned)} />
        <Line label="Rest taken" value={fmtMins(summary.restMins)} />
        <Line label="Rest left to book" value={fmtMins(data.earnedTimeBank)} />
      </Card>
      <AppText variant="label">First thing tomorrow</AppText>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="One small task, so the morning starts easy"
        placeholderTextColor={colors.muted}
        style={styles.input}
        maxLength={140}
        multiline
        accessibilityLabel="First task for tomorrow"
      />
      <AppText variant="small">Optional. You will see it on Today tomorrow.</AppText>
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <AppText variant="small">{label}</AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.xs },
  input: {
    minHeight: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: space.md,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
