import { Text, View } from "react-native";

import { colors } from "../constants/theme";

interface AvatarProps {
  name: string;
  size?: number;
}

export default function Avatar({ name, size = 64 }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View
      className="items-center justify-center rounded-full bg-sky-100"
      style={{ width: size, height: size }}
    >
      <Text
        className="font-semibold"
        style={{ color: colors.primary, fontSize: size * 0.4 }}
      >
        {initials || "?"}
      </Text>
    </View>
  );
}