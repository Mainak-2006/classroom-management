import { useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

import { colors } from "../constants/theme";

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function FormInput({ label, error, onFocus, onBlur, ...rest }: FormInputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.danger
    : focused
      ? colors.primary
      : colors.border;

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-slate-700">{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
        className="rounded-lg border px-4 py-3 text-base text-slate-900"
        style={{ borderColor }}
      />
      {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
