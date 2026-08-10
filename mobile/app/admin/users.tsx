import { Text, View } from "react-native";

import Screen from "../../components/Screen";

export default function AdminUsersScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl font-bold text-slate-800">Users</Text>
        <Text className="mt-2 text-sm text-slate-500">Boilerplate screen</Text>
      </View>
    </Screen>
  );
}