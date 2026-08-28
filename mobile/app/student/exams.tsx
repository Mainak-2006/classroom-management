import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { Course, ExamSubmission } from "../../lib/types";
import { ExamStatus } from "../../lib/types";

const STATUS_FILTERS: { value: ExamStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: ExamStatus.PUBLISHED, label: "Published" },
  { value: ExamStatus.DRAFT, label: "Draft" },
  { value: ExamStatus.CLOSED, label: "Closed" },
];

function formatExamDate(examDateIso: string): { formatted: string; isPast: boolean; label: string } {
  const examDate = new Date(examDateIso);
  const now = new Date();
  const diffTime = examDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formatted = examDate.toISOString().slice(0, 10);
  if (diffDays < 0) {
    return { formatted, isPast: true, label: "Completed" };
  }
  if (diffDays === 0) {
    return { formatted, isPast: false, label: "Today" };
  }
  if (diffDays === 1) {
    return { formatted, isPast: false, label: "Tomorrow" };
  }
  return { formatted, isPast: false, label: `In ${diffDays} days` };
}

export default function StudentExamsScreen() {
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ExamStatus | "ALL">("ALL");

  const loadData = useCallback(async () => {
    try {
      const [submissionList, courseList] = await Promise.all([
        studentService.getExams(),
        studentService.getCourses(),
      ]);
      setSubmissions(submissionList);
      setCourses(courseList);
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

  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) {
      map.set(c.id, c);
    }
    return map;
  }, [courses]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const exam = s.exam;
      if (!exam) return false;
      if (selectedCourseId && exam.courseId !== selectedCourseId) return false;
      if (selectedStatus !== "ALL" && exam.status !== selectedStatus) return false;
      return true;
    });
  }, [submissions, selectedCourseId, selectedStatus]);

  const getStatusColor = (status: ExamStatus): string => {
    switch (status) {
      case ExamStatus.PUBLISHED:
        return "bg-emerald-100 text-emerald-800";
      case ExamStatus.DRAFT:
        return "bg-amber-100 text-amber-800";
      case ExamStatus.CLOSED:
        return "bg-slate-100 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getGradedBadge = (submission: ExamSubmission): { text: string; bg: string; textColor: string } => {
    if (submission.score !== undefined && submission.score !== null) {
      return { text: "Graded", bg: "bg-emerald-100", textColor: "text-emerald-700" };
    }
    return { text: "Pending", bg: "bg-amber-100", textColor: "text-amber-700" };
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text className="text-2xl font-bold text-slate-900">Exams</Text>
        <Text className="mt-0.5 text-xs text-slate-500">View your exam submissions & grades</Text>

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
        ) : submissions.length === 0 ? (
          <View className="mt-20 items-center">
            <Ionicons name="school-outline" size={40} color={colors.textMuted} />
            <Text className="mt-3 text-sm font-semibold text-slate-700">No exam submissions yet</Text>
            <Text className="mt-1 text-center text-xs text-slate-400">
              Your exam submissions will appear here after you take exams.
            </Text>
          </View>
        ) : (
          <View className="mt-4 pb-28">
            {/* Course Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setSelectedCourseId(null)}
                  className="rounded-full px-3.5 py-1.5"
                  style={{
                    backgroundColor: selectedCourseId === null ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor: selectedCourseId === null ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: selectedCourseId === null ? "#FFFFFF" : colors.textMuted }}
                  >
                    All Courses
                  </Text>
                </Pressable>
                {courses.map((course) => {
                  const isSelected = selectedCourseId === course.id;
                  return (
                    <Pressable
                      key={course.id}
                      onPress={() => setSelectedCourseId(course.id)}
                      className="rounded-full px-3.5 py-1.5"
                      style={{
                        backgroundColor: isSelected ? colors.primary : colors.surface,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: isSelected ? "#FFFFFF" : colors.textMuted }}
                      >
                        {course.code}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Status Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2.5 flex-grow-0">
              <View className="flex-row gap-2">
                {STATUS_FILTERS.map((f) => {
                  const isSelected = selectedStatus === f.value;
                  return (
                    <Pressable
                      key={f.value}
                      onPress={() => setSelectedStatus(f.value)}
                      className="rounded-lg px-3 py-1"
                      style={{
                        backgroundColor: isSelected ? "#0F172A" : colors.surface,
                        borderWidth: 1,
                        borderColor: isSelected ? "#0F172A" : colors.border,
                      }}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          isSelected ? "text-white font-semibold" : "text-slate-600"
                        }`}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Exams List */}
            {filteredSubmissions.length === 0 ? (
              <View className="mt-12 items-center rounded-xl border border-slate-200 bg-white p-8">
                <Ionicons name="school-outline" size={40} color={colors.textMuted} />
                <Text className="mt-3 text-sm font-semibold text-slate-700">No exams found</Text>
                <Text className="mt-1 text-center text-xs text-slate-400">
                  {selectedCourseId || selectedStatus !== "ALL"
                    ? "No exam submissions matching the selected filters."
                    : "No exam submissions yet."}
                </Text>
              </View>
            ) : (
              <View className="mt-4 gap-3">
                {filteredSubmissions.map((submission) => {
                  const exam = submission.exam;
                  if (!exam) return null;

                  const course = courseMap.get(exam.courseId);
                  const dateInfo = formatExamDate(exam.examDate);
                  const statusColor = getStatusColor(exam.status);
                  const gradedBadge = getGradedBadge(submission);

                  return (
                    <View
                      key={submission.id}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">
                          {course ? `${course.code} · ${course.name}` : "Course"}
                        </Text>
                        <Text className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusColor}`}>
                          {exam.status}
                        </Text>
                      </View>

                      <Text className="mt-2 text-base font-bold text-slate-900">{exam.title}</Text>

                      {exam.description ? (
                        <Text className="mt-1 text-xs text-slate-600" numberOfLines={2}>
                          {exam.description}
                        </Text>
                      ) : null}

                      <View className="mt-3 flex-row flex-wrap items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                          <Text className="text-xs font-medium text-slate-500">
                            {dateInfo.formatted} ({dateInfo.label})
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-1">
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                          <Text className="text-xs font-medium text-slate-500">
                            {exam.duration} mins
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-1">
                          <Ionicons name="ribbon-outline" size={14} color={colors.textMuted} />
                          <Text className="text-xs font-medium text-slate-500">
                            {exam.totalMarks} Marks
                          </Text>
                        </View>

                        <View
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${gradedBadge.bg} ${gradedBadge.textColor}`}
                        >
                          <Text> {gradedBadge.text}</Text>
                        </View>
                      </View>

                      {submission.score !== undefined && submission.score !== null ? (
                        <View className="mt-3 border-t border-slate-100 pt-3 flex-row items-center justify-between">
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="trophy-outline" size={14} color={colors.primary} />
                            <Text className="text-sm font-semibold text-slate-900">
                              Score: {submission.score}/{exam.totalMarks}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                            <Text className="text-xs text-slate-500">
                              Submitted: {new Date(submission.submittedAt).toISOString().slice(0, 10)}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}