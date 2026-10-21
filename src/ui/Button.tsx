import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '@/theme';
import { AppText } from './Text';

interface Props {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  accent?: string; // fill color for primary
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, kind = 'primary', accent, disabled, busy, small, style }: Props) {
  const off = disabled || busy;
  const fill = kind === 'primary' ? (accent ?? colors.grind) : kind === 'secondary' ? colors.surfaceHigh : 'transparent';
  const textColor = kind === 'primary' ? colors.onAccent : kind === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        small ? styles.small : null,
        { backgroundColor: fill },
        kind === 'danger' ? styles.danger : null,
        pressed && !off ? styles.pressed : null,
        off ? styles.off : null,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText variant="body" color={textColor} style={styles.text}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  small: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.sm },
  danger: { borderWidth: 1, borderColor: colors.danger },
  pressed: { opacity: 0.8 },
  off: { opacity: 0.4 },
  text: { fontWeight: '600' },
});
