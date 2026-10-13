import { StyleSheet, Text, TextProps } from 'react-native';
import { colors } from '@/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'small' | 'label';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

export function AppText({ variant = 'body', color, center, style, ...rest }: Props) {
  return <Text {...rest} style={[styles[variant], color ? { color } : null, center ? styles.center : null, style]} />;
}

const styles = StyleSheet.create({
  display: { color: colors.text, fontSize: 48, fontWeight: '700', letterSpacing: -1 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  heading: { color: colors.text, fontSize: 18, fontWeight: '600' },
  body: { color: colors.text, fontSize: 16, lineHeight: 22 },
  small: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  center: { textAlign: 'center' },
});
