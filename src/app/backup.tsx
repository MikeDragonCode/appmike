import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, TextInput } from 'react-native';

import { serializeBackup, toCsv } from '@/core';
import { useStore } from '@/state/store';
import { colors, radius, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ModalHeader } from '@/ui/ModalHeader';
import { RestoreForm } from '@/ui/RestoreForm';
import { Screen } from '@/ui/Screen';
import { AppText } from '@/ui/Text';

export default function Backup() {
  const router = useRouter();
  const { data } = useStore();
  const [shareNote, setShareNote] = useState<string | null>(null);
  if (!data) return null;

  const backup = serializeBackup(data, new Date());

  async function share() {
    try {
      await Share.share({ message: backup, title: 'Shift to Life backup' });
      setShareNote(null);
    } catch {
      setShareNote('Sharing is not available here. Copy the text below instead.');
    }
  }

  async function shareCsv() {
    try {
      await Share.share({ message: toCsv(data!), title: 'Shift to Life export.csv' });
      setShareNote(null);
    } catch {
      setShareNote('Sharing is not available here.');
    }
  }

  return (
    <Screen>
      <ModalHeader title="Backup" action="Done" />

      <AppText variant="label">Save</AppText>
      <Card style={styles.group}>
        <AppText variant="small">
          Send the backup to yourself (notes, email, messages). To restore it later, paste it below.
        </AppText>
        <Button title="Share backup" onPress={share} />
        {shareNote ? (
          <AppText variant="small" color={colors.grindText}>
            {shareNote}
          </AppText>
        ) : null}
        <TextInput
          value={backup}
          multiline
          editable={false}
          selectTextOnFocus
          style={[styles.input, styles.readonly]}
          accessibilityLabel="Backup text"
        />
      </Card>

      <AppText variant="label">Spreadsheet</AppText>
      <Card style={styles.group}>
        <AppText variant="small">
          One row per activity per day, as CSV text. Paste it into a spreadsheet to look at your own numbers. This is
          not a backup, it cannot be restored.
        </AppText>
        <Button kind="secondary" title="Share as CSV" onPress={shareCsv} />
      </Card>

      <AppText variant="label">Restore</AppText>
      <Card style={styles.group}>
        <AppText variant="small">Restoring replaces everything on this phone with the backup.</AppText>
        <RestoreForm onRestored={() => router.back()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.md },
  input: {
    minHeight: 96,
    maxHeight: 200,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    padding: space.md,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  readonly: { color: colors.muted },
});
