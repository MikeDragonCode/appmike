import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import { fmtMins } from '@/ui/format';
import { AppText } from '@/ui/Text';

const CHEERS = [
  'That one is yours. Go enjoy it.',
  'Earned fair and square.',
  'Put it in the bank, spend it well.',
  'Nicely done. Something fun is waiting.',
  'You did the work. Now the good part.',
];

// The reward after a block of work: the rest it earned, popping in and counting up.
export function Prize({ earned, seed }: { earned: number; seed: number }) {
  const [pop] = useState(() => new Animated.Value(0.5));
  const [shown, setShown] = useState(0);

  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 110, useNativeDriver: true }).start();
  }, [pop]);

  // Counts up to the target over about a second, so the number feels earned.
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 900);
      setShown(Math.round(earned * (1 - Math.pow(1 - k, 3))));
      if (k >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [earned]);

  return (
    <>
      <Animated.View style={[styles.pop, { transform: [{ scale: pop }] }]} accessibilityLabel={`Rest earned: ${fmtMins(earned)}`}>
        <AppText variant="display" color={colors.grindText}>
          +{fmtMins(shown)}
        </AppText>
      </Animated.View>
      <AppText variant="body">{CHEERS[Math.abs(Math.round(seed)) % CHEERS.length]}</AppText>
    </>
  );
}

const styles = StyleSheet.create({ pop: { alignSelf: 'flex-start' } });
