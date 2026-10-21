import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Moment } from '@/core';
import { colors, space } from '@/theme';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { success } from '@/ui/haptics';
import { AppText } from '@/ui/Text';

interface Props {
  moment: Moment;
  more: number; // how many more are waiting after this one
  onSeen: () => void;
}

// A small reward that pops in once. It asks for nothing: one tap and it goes into the collection.
export function NewMoment({ moment, more, onSeen }: Props) {
  const [pop] = useState(() => new Animated.Value(0.6));
  useEffect(() => {
    pop.setValue(0.6);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start();
    success();
  }, [moment.id, pop]);

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Animated.Text style={[styles.emoji, { transform: [{ scale: pop }] }]} accessibilityElementsHidden>
          {moment.emoji}
        </Animated.Text>
        <View style={styles.text}>
          <AppText variant="label">New moment{more > 0 ? `, ${more} more waiting` : ''}</AppText>
          <AppText variant="heading">{moment.title}</AppText>
          <AppText variant="small">{moment.line}</AppText>
        </View>
      </View>
      <Button small kind="secondary" title="Nice" onPress={onSeen} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: colors.grind, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  emoji: { fontSize: 44 },
  text: { flex: 1, gap: 2 },
});
