import "../global.css";

import { Stack } from "expo-router";
import { useEffect } from "react";

import { useAuthStore } from "../stores/authStore";

export default function RootLayout() {
  const status = useAuthStore((state) => state.status);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (status === "hydrating") {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
