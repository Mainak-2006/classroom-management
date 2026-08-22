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
import { assignmentService } from "../../lib/api/assignment";
import { getApiErrorMessage } from "../../lib/api/client";
import { examService } from "../../lib/api/exam";
import { teacherService } from "../../lib/api/teacher";
import type { Assignment, Course, Exam, Teacher } from "../../lib/types";
import { AssignmentStatus, ExamStatus } from "../../lib/types";

const MONTHS = [
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

function formatToday(): string {
  const now = new Date();
  const day = now.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const weekday = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][now.getDay()];
  return `${weekday}, ${MONTHS[now.getMonth()]} ${day}${suffix}`;
}

export default function TeacherDashboardScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<Teacher | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [prof, courseList] = await Promise.all([
        teacherService.getProfile(),
        teacherService.getCourses(),
      ]);
      setProfile(prof);
      setCourses(courseList);

      // Load assignments and exams for teacher's courses
      if (courseList.length > 0) {
        const assignmentPromises = courseList.map((c) =>
          assignmentService.byCourse(c.id).catch(() => [] as Assignment[]),
        );
        const examPromises = courseList.map((c) =>
          examService.byCourse(c.id).catch(() => [] as Exam[]),
        );

        const [assignmentResults, examResults] = await Promise.all([
          Promise.all(assignmentPromises),
          Promise.all(examPromises),
        ]);

        setAssignments(assignmentResults.flat());
        setExams(examResults.flat());
      } else {
        setAssignments([]);
        setExams([]);
      }
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

  const teacherName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(" ")
    : "Teacher";

  const totalStudents = useMemo(() => {
    const studentIds = new Set<string>();
    for (const c of courses) {
      for (const s of c.students ?? []) {
        studentIds.add(s.id);
      }
    }
    return studentIds.size;
  }, [courses]);

  const activeAssignmentsCount = useMemo(
    () => assignments.filter((a) => a.status === AssignmentStatus.PUBLISHED).length,
    [assignments],
  );

  const upcomingExamsCount = useMemo(
    () => exams.filter((e) => e.status === ExamStatus.PUBLISHED).length,
    [exams],
  );

  const upcomingExams = useMemo(() => {
    return [...exams]
      .filter((e) => e.status !== ExamStatus.CLOSED)
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
      .slice(0, 3);
  }, [exams]);

  const recentAssignments = useMemo(() => {
    return [...assignments]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [assignments]);

  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) {
      map.set(c.id, c);
    }
    return map;
  }, [courses]);

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Greeting */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-sky-600">
              {formatToday()}
            </Text>
            <Text className="mt-0.5 text-2xl font-bold text-slate-900">
              Welcome, {teacherName} 👋
            </Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              {profile?.designation ?? "Faculty"} · {profile?.department ?? "Department"}
            </Text>
          </View>
          {profile ? <Avatar name={teacherName} size={48} /> : null}
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
        ) : (
          <View className="mt-5 pb-28">
            {/* Stats Cards Grid */}
            <View className="flex-row flex-wrap gap-2.5">
              <View className="flex-1 min-w-[45%] rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-slate-500">Courses</Text>
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-sky-50">
                    <Ionicons name="book" size={14} color={colors.primary} />
                  </View>
                </View>
                <Text className="mt-2 text-2xl font-extrabold text-slate-900">
                  {courses.length}
                </Text>
                <Text className="text-[11px] text-slate-400">Assigned classes</Text>
              </View>

              <View className="flex-1 min-w-[45%] rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-slate-500">Students</Text>
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-50">
                    <Ionicons name="people" size={14} color="#10B981" />
                  </View>
                </View>
                <Text className="mt-2 text-2xl font-extrabold text-slate-900">
                  {totalStudents}
                </Text>
                <Text className="text-[11px] text-slate-400">Enrolled</Text>
              </View>

              <View className="flex-1 min-w-[45%] rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-slate-500">Assignments</Text>
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-indigo-50">
                    <Ionicons name="document-text" size={14} color="#6366F1" />
                  </View>
                </View>
                <Text className="mt-2 text-2xl font-extrabold text-slate-900">
                  {activeAssignmentsCount}
                </Text>
                <Text className="text-[11px] text-slate-400">Active tasks</Text>
              </View>

              <View className="flex-1 min-w-[45%] rounded-2xl border border-slate-200 bg-white p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-slate-500">Exams</Text>
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-amber-50">
                    <Ionicons name="school" size={14} color="#F59E0B" />
                  </View>
                </View>
                <Text className="mt-2 text-2xl font-extrabold text-slate-900">
                  {upcomingExamsCount}
                </Text>
                <Text className="text-[11px] text-slate-400">Scheduled</Text>
              </View>
            </View>

            {/* Quick Actions Shortcuts */}
            <Text className="mt-6 mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Quick Actions
            </Text>
            <View className="flex-row gap-2.5">
              <Pressable
                onPress={() => router.push("/teacher/attendance")}
                className="flex-1 items-center rounded-xl border border-slate-200 bg-white p-3"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <Ionicons name="calendar-outline" size={20} color="#10B981" />
                </View>
                <Text className="mt-2 text-center text-xs font-semibold text-slate-800">
                  Take Attendance
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/teacher/assignments")}
                className="flex-1 items-center rounded-xl border border-slate-200 bg-white p-3"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-sky-50">
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                </View>
                <Text className="mt-2 text-center text-xs font-semibold text-slate-800">
                  Assignments
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/teacher/exams")}
                className="flex-1 items-center rounded-xl border border-slate-200 bg-white p-3"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                  <Ionicons name="school-outline" size={20} color="#F59E0B" />
                </View>
                <Text className="mt-2 text-center text-xs font-semibold text-slate-800">
                  Grade Exams
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/teacher/students")}
                className="flex-1 items-center rounded-xl border border-slate-200 bg-white p-3"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-purple-50">
                  <Ionicons name="people-outline" size={20} color="#8B5CF6" />
                </View>
                <Text className="mt-2 text-center text-xs font-semibold text-slate-800">
                  Students
                </Text>
              </Pressable>
            </View>

            {/* My Courses / Today's Classes */}
            <View className="mt-6 flex-row items-center justify-between px-1">
              <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                My Courses ({courses.length})
              </Text>
              <Pressable onPress={() => router.push("/teacher/courses")}>
                <Text className="text-xs font-semibold text-sky-600">View All</Text>
              </Pressable>
            </View>

            {courses.length === 0 ? (
              <View className="mt-3 items-center rounded-xl border border-slate-200 bg-white p-6">
                <Text className="text-xs text-slate-500">
                  No courses assigned yet. Create your first course in the Courses tab.
                </Text>
              </View>
            ) : (
              <View className="mt-3 gap-2.5">
                {courses.slice(0, 3).map((c) => (
                  <View
                    key={c.id}
                    className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                          {c.code}
                        </Text>
                        <Text className="text-xs text-slate-400">Sem {c.semester}</Text>
                      </View>
                      <Text className="mt-1 text-sm font-bold text-slate-900">{c.name}</Text>
                      <Text className="mt-0.5 text-xs text-slate-500">
                        {(c.students ?? []).length} students enrolled
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => router.push("/teacher/attendance")}
                      className="rounded-lg bg-sky-50 px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-sky-600">Attendance</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Upcoming Exams Preview */}
            {upcomingExams.length > 0 ? (
              <View className="mt-6">
                <View className="flex-row items-center justify-between px-1 mb-3">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Upcoming Exams
                  </Text>
                  <Pressable onPress={() => router.push("/teacher/exams")}>
                    <Text className="text-xs font-semibold text-sky-600">Manage</Text>
                  </Pressable>
                </View>
                <View className="gap-2.5">
                  {upcomingExams.map((ex) => {
                    const c = courseMap.get(ex.courseId);
                    return (
                      <View
                        key={ex.id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5"
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs font-semibold text-sky-600">
                            {c ? `${c.code} · ${c.name}` : "Course Exam"}
                          </Text>
                          <Text className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            {ex.status}
                          </Text>
                        </View>
                        <Text className="mt-1 text-sm font-bold text-slate-900">{ex.title}</Text>
                        <View className="mt-1.5 flex-row items-center gap-3">
                          <Text className="text-xs text-slate-500">
                            📅 {ex.examDate.slice(0, 10)}
                          </Text>
                          <Text className="text-xs text-slate-500">⏱️ {ex.duration} mins</Text>
                          <Text className="text-xs text-slate-500">🎯 {ex.totalMarks} marks</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Recent Assignments Preview */}
            {recentAssignments.length > 0 ? (
              <View className="mt-6">
                <View className="flex-row items-center justify-between px-1 mb-3">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Recent Assignments
                  </Text>
                  <Pressable onPress={() => router.push("/teacher/assignments")}>
                    <Text className="text-xs font-semibold text-sky-600">Manage</Text>
                  </Pressable>
                </View>
                <View className="gap-2.5">
                  {recentAssignments.map((a) => {
                    const c = courseMap.get(a.courseId);
                    return (
                      <View
                        key={a.id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5"
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-xs font-semibold text-sky-600">
                            {c ? `${c.code} · ${c.name}` : "Assignment"}
                          </Text>
                          <Text className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {a.status}
                          </Text>
                        </View>
                        <Text className="mt-1 text-sm font-bold text-slate-900">{a.title}</Text>
                        <View className="mt-1.5 flex-row items-center gap-3">
                          <Text className="text-xs text-slate-500">
                            ⏰ Due: {a.dueDate.slice(0, 10)}
                          </Text>
                          <Text className="text-xs text-slate-500">
                            💯 {a.totalMarks} points
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}