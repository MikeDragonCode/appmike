import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radius, space } from '@/theme';
import { AppText } from '@/ui/Text';

interface Props {
  placeholder: string;
  // Return false to keep what was typed (the name is taken, say) so it can be fixed.
  onAdd: (name: string, emoji: string) => boolean | void;
}

// One name box, one Add button. Used when picking activities at the start and in Settings.
export function AddActivity({ placeholder, onAdd }: Props) {
  const [name, setName] = useState('');
  const ok = name.trim().length > 0;
  const submit = () => {
    if (!ok) return;
    if (onAdd(name.trim(), '') === false) return;
    setName('');
  };
  return (
    <View style={styles.row}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, styles.name]}
        maxLength={30}
        returnKeyType="done"
        onSubmitEditing={submit}
        accessibilityLabel={placeholder}
      />
      <Pressable accessibilityRole="button" onPress={submit} style={[styles.add, !ok ? styles.off : null]}>
        <AppText variant="body" color={colors.onAccent} style={styles.addText}>
          Add
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: {
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  name: { flex: 1, minWidth: 0 },
  add: { height: 48, paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: colors.grind, justifyContent: 'center' },
  off: { opacity: 0.35 },
  addText: { fontFamily: fonts.medium },
});
