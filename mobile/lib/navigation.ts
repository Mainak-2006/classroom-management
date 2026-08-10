import type { BottomTabNavigationOptions } from "expo-router/js-tabs";
import { Platform } from "react-native";

import { colors } from "../constants/theme";
import { UserRole } from "./types";

export type RoleHome = "/student" | "/teacher" | "/admin";

export function homeForRole(role: UserRole | undefined): RoleHome {
  switch (role) {
    case UserRole.TEACHER:
      return "/teacher";
    case UserRole.ADMIN:
      return "/admin";
    default:
      return "/student";
  }
}

export function tabScreenOptions(): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    ...(Platform.OS === "web" && {
      tabBarPosition: "left",
      tabBarLabelPosition: "beside-icon",
      tabBarStyle: { width: 150, borderRightWidth: 1, borderRightColor: colors.border },
      tabBarActiveBackgroundColor: colors.primary,
      tabBarActiveTintColor: "#FFFFFF",
    }),
  };
}