import { StyleSheet, Text, TextProps } from 'react-native';
import { colors, fonts } from '@/theme';

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
  display: { color: colors.text, fontFamily: fonts.light, fontSize: 72, lineHeight: 76, letterSpacing: -3 },
  title: { color: colors.text, fontFamily: fonts.medium, fontSize: 32, lineHeight: 36, letterSpacing: -1.3 },
  heading: { color: colors.text, fontFamily: fonts.medium, fontSize: 18, lineHeight: 24, letterSpacing: -0.3 },
  body: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
  small: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, letterSpacing: -0.1 },
  label: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  center: { textAlign: 'center' },
});
