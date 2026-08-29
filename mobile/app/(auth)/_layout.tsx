import { Redirect, Stack } from "expo-router";

import { homeForRole } from "../../lib/navigation";
import { useAuthStore } from "../../stores/authStore";

export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);

  if (status === "hydrating") {
    return null;
  }

  if (status === "authenticated") {
    return <Redirect href={homeForRole(role)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
