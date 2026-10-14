import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, space } from '@/theme';

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

// Content scrolls up under the clock and battery. This repaints the wall over that strip, and dissolves the
// content just below it, so cards never show their corners behind the status bar or end on a hard line.
export function StatusBarMask({ height }: { height: number }) {
  return (
    <>
      <View pointerEvents="none" style={[styles.strip, { height }]}>
        <Backdrop />
      </View>
      <View pointerEvents="none" style={[styles.fade, { top: height }]}>
        <Image source={require('../../assets/images/fade.png')} resizeMode="stretch" style={styles.fadeImage} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  lamp: { position: 'absolute', top: 0, left: 0, width: '100%' },
  strip: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  // As tall as the gap above the first line of content, so nothing is dimmed until it scrolls.
  fade: { position: 'absolute', left: 0, right: 0, height: space.lg },
  fadeImage: { width: '100%', height: '100%' },
});
