import { Redirect } from "expo-router";

import { useAuthStore } from "../stores/authStore";

export default function Index() {
  const status = useAuthStore((state) => state.status);

  if (status === "hydrating") {
    return null;
  }

  if (status === "authenticated") {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
