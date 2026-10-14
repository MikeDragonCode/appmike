import { Pressable } from 'react-native';
import { colors } from '@/theme';
import { AppText } from './Text';

interface Props {
  title: string;
  onPress: () => void;
  label?: string; // for screen readers, when it should say more than the visible words
  color?: string;
}

// A quiet text action such as "Done" or "Undo". It looks small, but the touch area is a full 44 points tall,
// and it dims while pressed so a tap is never met with silence.
export function TextButton({ title, onPress, label, color = colors.text }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.6 } : null)}
    >
      <AppText variant="small" color={color}>
        {title}
      </AppText>
    </Pressable>
  );
}
