import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';

interface Props {
  children: ReactNode;
  footer?: ReactNode; // pinned under the scroll area
  scroll?: boolean;
  padTop?: boolean; // false when a native header is already shown
  style?: ViewStyle;
}

export function Screen({ children, footer, scroll = true, padTop = true, style }: Props) {
  const insets = useSafeAreaInsets();
  const top = padTop ? insets.top + space.lg : space.lg;
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: top }, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, { paddingTop: top }, style]}>{children}</View>
  );
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.lg },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, gap: space.sm },
});
