import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, View ,ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "../../components/Button";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { useAuthStore } from "../../stores/authStore";

export default function AdminProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await logout();
    } finally {
      setLoading(false);
    }
  };
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <ScrollView className="flex-1 pt-4" style={{ paddingTop: insets.top }}>
        <Text className="text-2xl font-bold text-slate-900">Profile</Text>

        <View className="mt-6 items-center rounded-xl border border-slate-200 bg-white p-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-sky-100">
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <Text className="mt-3 text-lg font-semibold text-slate-900">{user?.email}</Text>
          <Text className="mt-1 text-sm capitalize text-slate-500">{user?.role}</Text>
        </View>

        <View className="mt-auto mb-28">
          <Button title="Log Out" onPress={handleLogout} loading={loading} variant="secondary" />
        </View>
      </ScrollView>
    </Screen>
  );
}