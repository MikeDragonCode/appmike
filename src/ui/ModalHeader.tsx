import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TextButton } from './TextButton';
import { AppText } from './Text';

interface Props {
  title: string;
  action?: 'Close' | 'Done'; // the word on the button that leaves the screen
  onClose?: () => void;
}

export function ModalHeader({ title, action = 'Close', onClose }: Props) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      <TextButton title={action} onPress={onClose ?? (() => router.back())} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1 },
});
