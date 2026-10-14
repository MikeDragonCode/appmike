import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '@/theme';

// The wall behind every screen, with lamp light falling from the top.
// The light is a soft picture (see scripts/make-images.py), so it looks the same on every platform.
// An Image takes the width of its file unless told otherwise, so the width is set to the full screen.
export function Backdrop() {
  const { height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      <Image
        source={require('../../assets/images/lamp.png')}
        resizeMode="stretch"
        style={[styles.lamp, { height: Math.min(height, 620) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lamp: { position: 'absolute', top: 0, left: 0, width: '100%' },
});
