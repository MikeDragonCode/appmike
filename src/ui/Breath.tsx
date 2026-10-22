import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, space } from '@/theme';
import { AppText } from '@/ui/Text';

const PHASE_MS = 4000;

// One slow breath before the reward: a circle that swells and settles. It ends by itself after one breath and
// never blocks anything: the caller also offers a way to skip it.
export function Breath({ onDone }: { onDone: () => void }) {
  const [size] = useState(() => new Animated.Value(0.55));
  const [inhale, setInhale] = useState(true);

  useEffect(() => {
    const swell = Animated.timing(size, { toValue: 1, duration: PHASE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const settle = Animated.timing(size, { toValue: 0.55, duration: PHASE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const run = Animated.sequence([swell, settle]);
    run.start();
    const flip = setTimeout(() => setInhale(false), PHASE_MS);
    const end = setTimeout(onDone, PHASE_MS * 2);
    return () => {
      run.stop();
      clearTimeout(flip);
      clearTimeout(end);
    };
  }, [size, onDone]);

  return (
    <View style={styles.wrap} accessible accessibilityLabel={inhale ? 'Breathe in' : 'Breathe out'}>
      <Animated.View style={[styles.orb, { transform: [{ scale: size }] }]} />
      <AppText variant="heading">{inhale ? 'Breathe in' : 'Breathe out'}</AppText>
      <AppText variant="small">Your rest is ready right after.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  orb: { width: 160, height: 160, borderRadius: 80, backgroundColor: colors.grind, marginBottom: space.lg },
});
