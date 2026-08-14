import { Pressable, Text, View } from "react-native";

import { colors } from "../constants/theme";
import { Gender } from "../lib/types";

interface GenderPickerProps {
  value: Gender | "";
  onChange: (gender: Gender) => void;
  disabled?: boolean;
}

export default function GenderPicker({ value, onChange, disabled }: GenderPickerProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-slate-700">Gender</Text>
      <View className="flex-row gap-2">
        {Object.values(Gender).map((g) => (
          <Pressable
            key={g}
            onPress={() => onChange(g)}
            disabled={disabled}
            className="flex-1 items-center rounded-lg border py-3"
            style={{
              borderColor: value === g ? colors.primary : colors.border,
              backgroundColor: value === g ? "#EFF6FF" : colors.surface,
            }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: value === g ? colors.primary : colors.textMuted }}
            >
              {g.charAt(0) + g.slice(1).toLowerCase()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}