import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import AdvancedTabs from "../../components/AdvancedTabs";
import { homeForRole } from "../../lib/navigation";
import { UserRole } from "../../lib/types";
import { useAuthStore } from "../../stores/authStore";

export default function StudentTabsLayout() {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);

  if (status !== "authenticated") {
    return <Redirect href="/(auth)/login" />;
  }

  if (role !== UserRole.STUDENT) {
    return <Redirect href={homeForRole(role)} />;
  }

  return (
    <AdvancedTabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
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
        name="assignments"
        options={{
          title: "Assignments",
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
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
        name="attendance"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </AdvancedTabs>
  );
}