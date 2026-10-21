import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { discardUnreadable } from '@/state/store';
import { colors, space } from '@/theme';
import { Button } from './Button';
import { Card } from './Card';
import { RestoreForm } from './RestoreForm';
import { Screen } from './Screen';
import { AppText } from './Text';

// Shown instead of the app when saved data exists but cannot be read.
// It never starts a new account silently: the person chooses.
export function Recovery({ raw }: { raw: string }) {
  const [armed, setArmed] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    try {
      await Share.share({ message: raw, title: 'Shift to Life saved data' });
      setNote(null);
    } catch {
      setNote('Sharing is not available here.');
    }
  }

  return (
    <Screen>
      <View style={styles.block}>
        <AppText variant="title">We could not read your saved data</AppText>
        <AppText variant="small">
          Something on this phone damaged it. A copy is kept aside, nothing has been erased. You can send the copy to
          yourself, restore from a backup, or start fresh.
        </AppText>
      </View>

      <Card style={styles.block}>
        <AppText variant="label">Restore from a backup</AppText>
        <RestoreForm confirm={false} />
      </Card>

      <Card style={styles.block}>
        <AppText variant="label">Keep the damaged copy</AppText>
        <Button kind="secondary" title="Share the damaged copy" onPress={share} />
        {note ? (
          <AppText variant="small" color={colors.grindText}>
            {note}
          </AppText>
        ) : null}
      </Card>

      <Button
        kind="danger"
        title={armed ? 'Tap again to start fresh' : 'Start fresh'}
        onPress={() => (armed ? discardUnreadable() : setArmed(true))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
});
