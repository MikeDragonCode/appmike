import { StyleSheet } from 'react-native';
import { weeklyRecap } from '@/core';
import { space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { fmtMins } from '@/ui/format';
import { AppText } from '@/ui/Text';

type Recap = NonNullable<ReturnType<typeof weeklyRecap>>;

export function RecapCard({ recap, onDismiss }: { recap: Recap; onDismiss: () => void }) {
  return (
    <Card>
      <AppText variant="label">Your week</AppText>
      <AppText variant="body">
        You worked {fmtMins(recap.workMins)} and rested {fmtMins(recap.restMins)}.
      </AppText>
      {recap.restSlots > 0 ? (
        <AppText variant="small">
          {recap.restSlots} rest {recap.restSlots === 1 ? 'slot' : 'slots'} taken on purpose.
        </AppText>
      ) : null}
      {recap.goodDays > 0 ? (
        <AppText variant="small">
          {recap.goodDays} good {recap.goodDays === 1 ? 'day' : 'days'}.
        </AppText>
      ) : null}
      {recap.slotGoal > 0 ? (
        <AppText variant="small">
          {recap.restSlots >= recap.slotGoal ? 'Weekly rest goal reached.' : `The goal was ${recap.slotGoal}. A new week starts now.`}
        </AppText>
      ) : null}
      <Button small kind="secondary" title="Got it" style={styles.btn} onPress={onDismiss} />
    </Card>
  );
}

const styles = StyleSheet.create({ btn: { alignSelf: 'flex-start', marginTop: space.sm } });
