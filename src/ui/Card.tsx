import { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, space } from '@/theme';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  hero?: boolean; // the deep orange variant, for the one thing that matters on a screen
  selected?: boolean;
  tint?: string; // border color when selected
  style?: ViewStyle;
}

export function Card({ children, onPress, hero, selected, tint = colors.text, style }: Props) {
  const box = [styles.card, hero ? styles.hero : null, selected ? { borderColor: tint } : null, style];
  const inner = hero ? (
    <>
      <Image source={require('../../assets/images/hero.png')} resizeMode="stretch" style={styles.heroImage} />
      {children}
    </>
  ) : (
    children
  );
  if (!onPress) return <View style={box}>{inner}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [...box, pressed ? styles.pressed : null]}>
      {inner}
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
  hero: { backgroundColor: '#d12d20', borderColor: 'transparent', overflow: 'hidden' },
  heroImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  pressed: { opacity: 0.85 },
});
