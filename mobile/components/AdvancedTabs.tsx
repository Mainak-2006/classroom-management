import type { PropsWithChildren } from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";

import type { BottomTabBarProps } from "expo-router/js-tabs";

import { tabScreenOptions } from "../lib/navigation";
import AdvancedTabBar from "./AdvancedTabBar";

export default function AdvancedTabs({ children }: PropsWithChildren) {
  return (
    <Tabs
      screenOptions={tabScreenOptions()}
      tabBar={
        Platform.OS === "web"
          ? undefined
          : (props: BottomTabBarProps) => <AdvancedTabBar {...props} />
      }
    >
      {children}
    </Tabs>
  );
}
