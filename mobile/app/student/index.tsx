import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import Button from "../../components/Button";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { getApiErrorMessage } from "../../lib/api/client";
import { studentService } from "../../lib/api/student";
import { router, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import type { Assignment, Attendance, Course, ExamSubmission } from "../../lib/types";
import { AssignmentStatus, AttendanceStatus, ExamStatus } from "../../lib/types";

export default function StudentHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmission[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [courseList, assignmentList, submissionList, attendanceList] = await Promise.all([
        studentService.getCourses(),
        studentService.getAssignments(),
        studentService.getExams(),
        studentService.getAttendance(),
      ]);
      setCourses(courseList);
      setAssignments(assignmentList);
      setExamSubmissions(submissionList);
      setAttendance(attendanceList);
      setError(null);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const enrolledCourses = courses.length;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingAssignments = assignments.filter((a) => {
      if (a.status !== AssignmentStatus.PUBLISHED) return false;
      const dueDate = new Date(a.dueDate);
      return dueDate >= now && dueDate <= sevenDaysFromNow;
    }).length;

    const upcomingExams = examSubmissions.filter((s) => {
      const exam = s.exam;
      if (!exam || exam.status !== ExamStatus.PUBLISHED) return false;
      const examDate = new Date(exam.examDate);
      return examDate >= now && examDate <= sevenDaysFromNow;
    }).length;

    let presentCount = 0;
    let totalCount = 0;
    for (const record of attendance) {
      totalCount += 1;
      if (record.status === AttendanceStatus.PRESENT) {
        presentCount += 1;
      }
    }
    const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    return {
      enrolledCourses,
      upcomingAssignments,
      upcomingExams,
      attendanceRate,
    };
  }, [courses, assignments, examSubmissions, attendance]);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const courseMap = new Map(courses.map((c) => [c.id, c]));
    const items: {
      id: string;
      type: "assignment" | "exam";
      title: string;
      courseName: string;
      date: Date;
      courseCode: string;
    }[] = [];

    for (const a of assignments) {
      if (a.status !== AssignmentStatus.PUBLISHED) continue;
      const dueDate = new Date(a.dueDate);
      if (dueDate < now) continue;
      const course = courseMap.get(a.courseId);
      items.push({
        id: a.id,
        type: "assignment",
        title: a.title,
        courseName: course?.name ?? "",
        date: dueDate,
        courseCode: course?.code ?? "",
      });
    }

    for (const s of examSubmissions) {
      const exam = s.exam as { id?: string; title?: string; status?: ExamStatus; examDate?: string; courseId?: string } | null;
      if (!exam || exam.status !== ExamStatus.PUBLISHED) continue;
      const examDate = new Date(exam.examDate!);
      if (examDate < now) continue;
      const course = exam.courseId ? courseMap.get(exam.courseId) : undefined;
      items.push({
        id: s.id,
        type: "exam",
        title: exam.title ?? "",
        courseName: course?.name ?? "",
        date: examDate,
        courseCode: course?.code ?? "",
      });
    }

    return items
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [assignments, examSubmissions, courses]);

  const firstName =
    (user as { firstName?: string } | null)?.firstName ??
    (user?.email ? user.email.split("@")[0] : "Student");

  const renderStatCard = (
    label: string,
    value: string | number,
    icon: ComponentProps<typeof Ionicons>["name"],
    iconColor: string,
    bgColor: string,
  ) => (
    <View className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-slate-500 uppercase tracking-wide">{label}</Text>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text className="mt-2 text-2xl font-bold text-slate-900">{value}</Text>
    </View>
  );

  const formatDate = (date: Date): string => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-slate-900">Welcome, {firstName}!</Text>
          <Text className="mt-1 text-sm text-slate-500">Here&apos;s your academic overview</Text>
        </View>

        {/* Stats Grid */}
        <View className="mb-6 gap-3">
          <View className="flex-row gap-3">
            {renderStatCard(
              "Enrolled Courses",
              stats.enrolledCourses,
              "book",
              colors.primary,
              "bg-sky-50",
            )}
            {renderStatCard(
              "Upcoming Assignments",
              stats.upcomingAssignments,
              "document-text",
              "#F59E0B",
              "bg-amber-50",
            )}
          </View>
          <View className="flex-row gap-3">
            {renderStatCard(
              "Upcoming Exams",
              stats.upcomingExams,
              "school",
              "#8B5CF6",
              "bg-violet-50",
            )}
            {renderStatCard(
              "Attendance Rate",
              `${stats.attendanceRate}%`,
              "calendar",
              "#10B981",
              "bg-emerald-50",
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-slate-900">Quick Actions</Text>
          <View className="mt-3 flex-row gap-3">
            <Pressable
              onPress={() => router.push("/student/courses")}
              className="flex-1 rounded-xl border border-slate-200 bg-white p-4 items-center"
            >
              <Ionicons name="book" size={24} color={colors.primary} />
              <Text className="mt-2 text-sm font-medium text-slate-700 text-center">Courses</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/student/assignments")}
              className="flex-1 rounded-xl border border-slate-200 bg-white p-4 items-center"
            >
              <Ionicons name="document-text" size={24} color="#F59E0B" />
              <Text className="mt-2 text-sm font-medium text-slate-700 text-center">Assignments</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/student/exams")}
              className="flex-1 rounded-xl border border-slate-200 bg-white p-4 items-center"
            >
              <Ionicons name="school" size={24} color="#8B5CF6" />
              <Text className="mt-2 text-sm font-medium text-slate-700 text-center">Exams</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/student/attendance")}
              className="flex-1 rounded-xl border border-slate-200 bg-white p-4 items-center"
            >
              <Ionicons name="calendar" size={24} color="#10B981" />
              <Text className="mt-2 text-sm font-medium text-slate-700 text-center">Attendance</Text>
            </Pressable>
          </View>
        </View>

        {/* Upcoming Deadlines */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-slate-900">Upcoming Deadlines</Text>
            <Pressable
              onPress={() => router.push("/student/assignments")}
              className="text-xs font-medium text-sky-600"
            >
              <Text className="text-xs font-medium text-sky-600">View All</Text>
            </Pressable>
          </View>

          {loading ? (
            <View className="mt-20 items-center">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View className="mt-20 items-center">
              <Text className="text-sm text-slate-500">{error}</Text>
              <View className="mt-4 w-40">
                <Button title="Retry" onPress={loadData} />
              </View>
            </View>
          ) : upcomingDeadlines.length === 0 ? (
            <View className="mt-8 items-center rounded-xl border border-slate-200 bg-white p-8">
              <Ionicons name="calendar-clear-outline" size={40} color={colors.textMuted} />
              <Text className="mt-3 text-sm font-semibold text-slate-700">No upcoming deadlines</Text>
              <Text className="mt-1 text-center text-xs text-slate-400">All caught up! 🎉</Text>
            </View>
          ) : (
            <View className="mt-3 gap-2">
              {upcomingDeadlines.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(item.type === "assignment" ? "/student/assignments" : "/student/exams")}
                  className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`rounded-lg p-2 ${
                        item.type === "assignment" ? "bg-amber-100" : "bg-violet-100"
                      }`}
                    >
                      <Ionicons
                        name={item.type === "assignment" ? "document-text" : "school"}
                        size={20}
                        color={item.type === "assignment" ? "#F59E0B" : "#8B5CF6"}
                      />
                    </View>
                    <View>
                      <Text className="text-sm font-semibold text-slate-900">{item.title}</Text>
                      <Text className="text-xs text-slate-500">
                        {item.courseCode ? `${item.courseCode} · ` : ""}{item.type === "assignment" ? "Assignment" : "Exam"}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-medium text-slate-700">{formatDate(item.date)}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

