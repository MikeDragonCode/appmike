import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import { serializeBackup } from '@/core';
import { useStore } from '@/state/store';
import { colors, radius, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
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

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title" style={styles.flex}>
          Backup
        </AppText>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <AppText variant="small" color={colors.text}>
            Done
          </AppText>
        </Pressable>
      </View>

      <AppText variant="label">Save</AppText>
      <Card style={styles.group}>
        <AppText variant="small">
          Send the backup to yourself (notes, email, messages). To restore it later, paste it below.
        </AppText>
        <Button title="Share backup" onPress={share} />
        {shareNote ? (
          <AppText variant="small" color={colors.grind}>
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

      <AppText variant="label">Restore</AppText>
      <Card style={styles.group}>
        <AppText variant="small">Restoring replaces everything on this phone with the backup.</AppText>
        <RestoreForm onRestored={() => router.back()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  group: { gap: space.md },
  input: {
    minHeight: 96,
    maxHeight: 200,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: space.md,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  readonly: { color: colors.muted },
});
