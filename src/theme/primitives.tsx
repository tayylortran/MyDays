import { Text as NativeText, TextInput as NativeTextInput, type TextProps, type TextInputProps } from 'react-native';
import { useTheme } from './ThemeProvider';
import type { Ref } from 'react';

export function Text({ style, ...props }: TextProps) {
  const { colors } = useTheme();
  return <NativeText {...props} style={[{ color: colors.text }, style]} />;
}

export function TextInput({ style, ref, ...props }: TextInputProps & { ref?: Ref<NativeTextInput> }) {
  const { colors, mode } = useTheme();
  return <NativeTextInput ref={ref} placeholderTextColor={colors.subtle} selectionColor={colors.accent}
    keyboardAppearance={mode} {...props} style={[{ color: colors.text }, style]} />;
}
