import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { homeForRole, tabScreenOptions } from "../../lib/navigation";
import { UserRole } from "../../lib/types";
import { useAuthStore } from "../../stores/authStore";

export default function AdminTabsLayout() {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);

  if (status !== "authenticated") {
    return <Redirect href="/(auth)/login" />;
  }

  if (role !== UserRole.ADMIN) {
    return <Redirect href={homeForRole(role)} />;
  }

  return (
    <Tabs screenOptions={tabScreenOptions()}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: "Courses",
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="exams"
        options={{
          title: "Exams",
          tabBarIcon: ({ color, size }) => <Ionicons name="school" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}