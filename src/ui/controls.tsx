import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/theme';
import { AppText } from './Text';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  tint?: string;
}

export function Chip({ label, selected, onPress, tint = colors.text }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      aria-selected={selected}
      onPress={onPress}
      style={[styles.chip, selected ? { backgroundColor: tint, borderColor: tint } : null]}
    >
      <AppText variant="small" color={selected ? colors.onAccent : colors.text} style={styles.chipText}>
        {label}
      </AppText>
    </Pressable>
  );
}

interface StepperProps {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
}

export function Stepper({ label, value, onMinus, onPlus, minusDisabled, plusDisabled }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <AppText variant="body" style={styles.stepLabel}>
        {label}
      </AppText>
      <View style={styles.stepRow}>
        <StepButton sign="-" onPress={onMinus} disabled={minusDisabled} label={`Decrease ${label}`} />
        <AppText variant="heading" center style={styles.stepValue}>
          {value}
        </AppText>
        <StepButton sign="+" onPress={onPlus} disabled={plusDisabled} label={`Increase ${label}`} />
      </View>
    </View>
  );
}

function StepButton({ sign, onPress, disabled, label }: { sign: string; onPress: () => void; disabled?: boolean; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={disabled ? undefined : onPress}
      style={[styles.stepBtn, disabled ? styles.off : null]}
      hitSlop={6}
    >
      <AppText variant="heading">{sign}</AppText>
    </Pressable>
  );
}

export function Row({ children, gap = space.sm }: { children: React.ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>{children}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  stepLabel: { flexShrink: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepValue: { minWidth: 64 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: 0.35 },
  divider: { height: 1, backgroundColor: colors.border },
});
