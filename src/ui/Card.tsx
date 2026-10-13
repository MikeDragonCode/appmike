import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, space } from '@/theme';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  tint?: string; // border color when selected
  style?: ViewStyle;
}

export function Card({ children, onPress, selected, tint = colors.text, style }: Props) {
  const box = [styles.card, selected ? { borderColor: tint } : null, style];
  if (!onPress) return <View style={box}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [...box, pressed ? styles.pressed : null]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.xs,
  },
  pressed: { opacity: 0.85 },
});
