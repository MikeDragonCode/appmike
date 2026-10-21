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
  display: { color: colors.text, fontFamily: fonts.display, fontSize: 52, fontWeight: '400', letterSpacing: -1.5 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 30, fontWeight: '400', letterSpacing: -0.6 },
  heading: { color: colors.text, fontSize: 18, fontWeight: '600' },
  body: { color: colors.text, fontSize: 16, lineHeight: 22 },
  small: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' },
  center: { textAlign: 'center' },
});
