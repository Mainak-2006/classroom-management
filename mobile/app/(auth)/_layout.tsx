import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "../../stores/authStore";

export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);

  if (status === "hydrating") {
    return null;
  }

  if (status === "authenticated") {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
