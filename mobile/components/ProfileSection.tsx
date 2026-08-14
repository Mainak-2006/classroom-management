import { PropsWithChildren } from "react";
import { Text, View } from "react-native";

interface ProfileSectionProps extends PropsWithChildren {
  title: string;
}

export default function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <View className="mt-6">
      <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </Text>
      <View className="rounded-xl border border-slate-200 bg-white px-4 py-2">{children}</View>
    </View>
  );
}
