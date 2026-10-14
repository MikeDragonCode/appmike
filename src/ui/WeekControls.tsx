import { StyleSheet, View } from 'react-native';
import { DAY_NAMES, MONDAY, SUNDAY, weekdayOrder } from '@/core';
import { space } from '@/theme';
import { Chip, Row } from '@/ui/controls';
import { AppText } from '@/ui/Text';

interface Props {
  weekStart: number;
  restDays: number[];
  onWeekStart: (day: number) => void;
  onRestDays: (days: number[]) => void;
  labelVariant?: 'label' | 'body';
}

// Which day the week starts on, and which days are rest days (listed in the order of that week).
// Shared by onboarding and Settings.
export function WeekControls({ weekStart, restDays, onWeekStart, onRestDays, labelVariant = 'label' }: Props) {
  const toggle = (day: number) => onRestDays(restDays.includes(day) ? restDays.filter((d) => d !== day) : [...restDays, day]);
  return (
    <View style={styles.block}>
      <AppText variant={labelVariant}>Week starts on</AppText>
      <Row>
        <Chip label="Monday" selected={weekStart === MONDAY} onPress={() => onWeekStart(MONDAY)} />
        <Chip label="Sunday" selected={weekStart === SUNDAY} onPress={() => onWeekStart(SUNDAY)} />
      </Row>
      <AppText variant={labelVariant}>Rest days</AppText>
      <Row>
        {weekdayOrder(weekStart).map((day) => (
          <Chip key={day} label={DAY_NAMES[day]} selected={restDays.includes(day)} onPress={() => toggle(day)} />
        ))}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({ block: { gap: space.sm } });
