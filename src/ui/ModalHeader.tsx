import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './Text';

export function ModalHeader({ title, onClose }: { title: string; onClose?: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={onClose ?? (() => router.back())}>
        <AppText variant="small">Close</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1 },
});
