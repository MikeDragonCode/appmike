import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { BackupError, parseBackup } from '@/core';
import { cancelAllReminders } from '@/services/notifications';
import { endFocus } from '@/state/actions';
import { setData } from '@/state/store';
import { colors, radius, space } from '@/theme';
import { Button } from './Button';
import { AppText } from './Text';

const ERRORS: Record<BackupError, string> = {
  not_json: 'That does not look like a backup. Paste the whole text.',
  wrong_file: 'This is not a Shift to Life backup.',
  newer_version: 'This backup comes from a newer version of the app. Update the app first.',
  damaged: 'The backup is damaged or incomplete, so it was not restored.',
};

// Paste a backup and replace everything on this phone with it.
export function RestoreForm({ onRestored, confirm = true }: { onRestored?: () => void; confirm?: boolean }) {
  const [text, setText] = useState('');
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function restore() {
    const r = parseBackup(text);
    if (!r.ok) {
      setArmed(false);
      return setError(ERRORS[r.error]);
    }
    if (confirm && !armed) return setArmed(true);
    // Booked reminders belong to the old data, so clear them and start from the backup.
    await cancelAllReminders();
    endFocus();
    setData(r.data);
    onRestored?.();
  }

  return (
    <>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError(null);
          setArmed(false);
        }}
        placeholder="Paste a backup here"
        placeholderTextColor={colors.muted}
        multiline
        style={styles.input}
        accessibilityLabel="Backup to restore"
      />
      {error ? (
        <AppText variant="small" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
      <Button
        kind={armed ? 'danger' : 'secondary'}
        title={armed ? 'Tap again to replace my data' : 'Restore'}
        disabled={!text.trim()}
        onPress={restore}
      />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 120,
    maxHeight: 220,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    padding: space.md,
    fontSize: 13,
    textAlignVertical: 'top',
    marginTop: space.xs,
  },
});
