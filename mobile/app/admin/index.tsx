import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { adminService } from "../../lib/api/admin";
import { getApiErrorMessage } from "../../lib/api/client";
import { courseService } from "../../lib/api/course";
import { examService } from "../../lib/api/exam";
import { studentService } from "../../lib/api/student";
import { teacherService } from "../../lib/api/teacher";
import type { Course, Exam } from "../../lib/types";
import { ExamStatus } from "../../lib/types";
import { useAuthStore } from "../../stores/authStore";

interface DashboardData {
  adminCount: number;
  teacherCount: number;
  studentCount: number;
  courses: Course[];
  exams: Exam[];
}

function formatExamDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [admins, teachers, students, courseResponse, examResponse] = await Promise.all([
        adminService.list(),
        teacherService.list(),
        studentService.list(),
        courseService.list(),
        examService.list(),
      ]);
      setDashboard({
        adminCount: admins.total,
        teacherCount: teachers.total,
        studentCount: students.total,
        courses: courseResponse.data,
        exams: examResponse.data,
      });
      setError(null);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadData();
    };
    void run();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const courseMap = useMemo(
    () => new Map(dashboard?.courses.map((course) => [course.id, course])),
    [dashboard?.courses],
  );

  const totalEnrollments = useMemo(
    () => dashboard?.courses.reduce((total, course) => total + (course.students?.length ?? 0), 0) ?? 0,
    [dashboard?.courses],
  );

  const scheduledExams = useMemo(
    () => dashboard?.exams.filter((exam) => exam.status === ExamStatus.PUBLISHED).length ?? 0,
    [dashboard?.exams],
  );

  const upcomingExams = useMemo(() => {
    const now = new Date();
    return (dashboard?.exams ?? [])
      .filter((exam) => exam.status !== ExamStatus.CLOSED && new Date(exam.examDate) >= now)
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
      .slice(0, 3);
  }, [dashboard?.exams]);

  const adminName = user?.email.split("@")[0] || "Admin";

  const statCards = dashboard
    ? [
        { label: "Students", value: dashboard.studentCount, icon: "people", color: "#10B981" },
        { label: "Teachers", value: dashboard.teacherCount, icon: "person", color: colors.primary },
        { label: "Courses", value: dashboard.courses.length, icon: "book", color: "#8B5CF6" },
        { label: "Scheduled Exams", value: scheduledExams, icon: "school", color: "#F59E0B" },
      ] as const
    : [];

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-sky-600">
              Administration
            </Text>
            <Text className="mt-0.5 text-2xl font-bold text-slate-900">Welcome, {adminName}</Text>
            <Text className="mt-1 text-xs text-slate-500">Your classroom at a glance</Text>
          </View>
          <Avatar name={adminName} size={48} />
        </View>

        {loading ? (
          <View className="mt-24 items-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View className="mt-20 items-center">
            <Text className="text-sm text-slate-500">{error}</Text>
            <View className="mt-4 w-40">
              <Button title="Retry" onPress={loadData} />
            </View>
          </View>
        ) : dashboard ? (
          <View className="mt-5 pb-28">
            <View className="flex-row flex-wrap gap-2.5">
              {statCards.map((card) => (
                <View key={card.label} className="min-w-[45%] flex-1 rounded-2xl border border-slate-200 bg-white p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-medium text-slate-500">{card.label}</Text>
                    <Ionicons name={card.icon} size={17} color={card.color} />
                  </View>
                  <Text className="mt-2 text-2xl font-extrabold text-slate-900">{card.value}</Text>
                </View>
              ))}
            </View>

            <View className="mt-3 flex-row items-center rounded-xl border border-slate-200 bg-white px-4 py-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-indigo-50">
                <Ionicons name="layers-outline" size={18} color="#6366F1" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-slate-900">{totalEnrollments} enrollments</Text>
                <Text className="text-xs text-slate-500">Across {dashboard.courses.length} active course records</Text>
              </View>
              <Text className="text-xs font-medium text-slate-500">{dashboard.adminCount} admins</Text>
            </View>

            <Text className="mt-6 mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Quick Actions
            </Text>
            <View className="flex-row gap-2.5">
              {([
                { title: "Users", icon: "people-outline", color: "#10B981", route: "/admin/users" },
                { title: "Courses", icon: "book-outline", color: colors.primary, route: "/admin/courses" },
                { title: "Exams", icon: "school-outline", color: "#F59E0B", route: "/admin/exams" },
              ] as const).map((action) => (
                <Pressable
                  key={action.title}
                  onPress={() => router.push(action.route as never)}
                  className="flex-1 items-center rounded-xl border border-slate-200 bg-white p-3"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-50">
                    <Ionicons name={action.icon} size={20} color={action.color} />
                  </View>
                  <Text className="mt-2 text-xs font-semibold text-slate-800">{action.title}</Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-7 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-900">Upcoming Exams</Text>
              <Pressable onPress={() => router.push("/admin/exams")}>
                <Text className="text-xs font-semibold text-sky-600">View all</Text>
              </Pressable>
            </View>

            {upcomingExams.length === 0 ? (
              <View className="mt-3 items-center rounded-xl border border-slate-200 bg-white p-7">
                <Ionicons name="school-outline" size={36} color={colors.textMuted} />
                <Text className="mt-2 text-sm font-semibold text-slate-700">No upcoming exams</Text>
                <Text className="mt-1 text-center text-xs text-slate-400">
                  Scheduled exams will appear here.
                </Text>
              </View>
            ) : (
              <View className="mt-3 gap-2">
                {upcomingExams.map((exam) => {
                  const course = courseMap.get(exam.courseId);
                  return (
                    <Pressable
                      key={exam.id}
                      onPress={() => router.push("/admin/exams")}
                      className="flex-row items-center rounded-xl border border-slate-200 bg-white p-3.5"
                    >
                      <View className="h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                        <Ionicons name="school" size={19} color="#F59E0B" />
                      </View>
                      <View className="ml-3 flex-1 pr-2">
                        <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                          {exam.title}
                        </Text>
                        <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                          {course ? `${course.code} · ${course.name}` : "Course"}
                        </Text>
                      </View>
                      <Text className="text-xs font-medium text-slate-500">{formatExamDate(exam.examDate)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
