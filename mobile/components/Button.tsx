import { ActivityIndicator, Pressable, Text } from "react-native";

import { colors } from "../constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: ButtonProps) {
  const isSecondary = variant === "secondary";
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className="items-center justify-center rounded-lg px-4 py-3.5"
      style={{
        backgroundColor: isSecondary
          ? colors.surface
          : isDisabled
            ? colors.border
            : colors.primary,
        borderWidth: isSecondary ? 1 : 0,
        borderColor: colors.border,
        opacity: isSecondary && isDisabled ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.primary : "#FFFFFF"} />
      ) : (
        <Text
          className="text-base font-semibold"
          style={{ color: isSecondary ? colors.primary : "#FFFFFF" }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
