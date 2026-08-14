import { Text, View } from "react-native";

interface ProfileRowProps {
  label: string;
  value?: string | number | null;
}

export default function ProfileRow({ label, value }: ProfileRowProps) {
  const hasValue = value !== undefined && value !== null && String(value).trim() !== "";

  return (
    <View className="flex-row justify-between gap-4 py-2.5">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="flex-1 text-right text-sm font-medium text-slate-900">
        {hasValue ? String(value) : "—"}
      </Text>
    </View>
  );
}
