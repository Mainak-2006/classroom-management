import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import Button from "../../components/Button";
import ExamFormSheet from "../../components/ExamFormSheet";
import ExamGradingSheet from "../../components/ExamGradingSheet";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { getApiErrorMessage } from "../../lib/api/client";
import { courseService } from "../../lib/api/course";
import { examService } from "../../lib/api/exam";
import type { Course, Exam } from "../../lib/types";
import { ExamStatus } from "../../lib/types";

const STATUS_FILTERS: { value: ExamStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: ExamStatus.PUBLISHED, label: "Published" },
  { value: ExamStatus.DRAFT, label: "Draft" },
  { value: ExamStatus.CLOSED, label: "Closed" },
];

function statusClass(status: ExamStatus): string {
  if (status === ExamStatus.PUBLISHED) return "bg-emerald-100 text-emerald-800";
  if (status === ExamStatus.DRAFT) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-800";
}

export default function AdminExamsScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ExamStatus | "ALL">("ALL");
  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [gradingSheetVisible, setGradingSheetVisible] = useState(false);
  const [gradingExam, setGradingExam] = useState<Exam | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [courseResponse, examResponse] = await Promise.all([
        courseService.list(),
        examService.list(),
      ]);
      setCourses(courseResponse.data);
      setExams(examResponse.data);
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

  const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);

  const filteredExams = useMemo(
    () =>
      exams
        .filter((exam) => {
          if (selectedCourseId && exam.courseId !== selectedCourseId) return false;
          return selectedStatus === "ALL" || exam.status === selectedStatus;
        })
        .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()),
    [exams, selectedCourseId, selectedStatus],
  );

  const activeGradingCourse = useMemo(
    () => (gradingExam ? courseMap.get(gradingExam.courseId) ?? null : null),
    [courseMap, gradingExam],
  );

  const openCreate = () => {
    setEditingExam(null);
    setFormSheetVisible(true);
  };

  const openEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormSheetVisible(true);
  };

  const openGrading = (exam: Exam) => {
    setGradingExam(exam);
    setGradingSheetVisible(true);
  };

  const handleDelete = (exam: Exam) => {
    Alert.alert("Delete Exam", `Are you sure you want to delete \"${exam.title}\"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await examService.remove(exam.id);
            await loadData();
          } catch (deleteError) {
            Alert.alert("Delete Failed", getApiErrorMessage(deleteError));
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-2xl font-bold text-slate-900">Exams</Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              Manage exams and student grades across all courses
            </Text>
          </View>
          <Pressable
            onPress={openCreate}
            disabled={courses.length === 0}
            className="flex-row items-center gap-1 rounded-full px-3.5 py-2"
            style={{ backgroundColor: courses.length === 0 ? colors.border : colors.primary }}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="text-sm font-semibold text-white">Schedule</Text>
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
        ) : courses.length === 0 ? (
          <View className="mt-20 items-center">
            <Ionicons name="book-outline" size={40} color={colors.textMuted} />
            <Text className="mt-3 text-sm font-semibold text-slate-700">No courses yet</Text>
            <Text className="mt-1 text-center text-xs text-slate-400">
              Create a course before scheduling exams.
            </Text>
          </View>
        ) : (
          <View className="mt-4 pb-28">
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
                  const selected = selectedCourseId === course.id;
                  return (
                    <Pressable
                      key={course.id}
                      onPress={() => setSelectedCourseId(course.id)}
                      className="rounded-full px-3.5 py-1.5"
                      style={{
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                      }}
                    >
                      <Text className="text-xs font-medium" style={{ color: selected ? "#FFFFFF" : colors.textMuted }}>
                        {course.code}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2.5 flex-grow-0">
              <View className="flex-row gap-2">
                {STATUS_FILTERS.map((filter) => {
                  const selected = selectedStatus === filter.value;
                  return (
                    <Pressable
                      key={filter.value}
                      onPress={() => setSelectedStatus(filter.value)}
                      className="rounded-lg px-3 py-1"
                      style={{
                        backgroundColor: selected ? "#0F172A" : colors.surface,
                        borderWidth: 1,
                        borderColor: selected ? "#0F172A" : colors.border,
                      }}
                    >
                      <Text className={`text-xs font-medium ${selected ? "font-semibold text-white" : "text-slate-600"}`}>
                        {filter.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {filteredExams.length === 0 ? (
              <View className="mt-12 items-center rounded-xl border border-slate-200 bg-white p-8">
                <Ionicons name="school-outline" size={40} color={colors.textMuted} />
                <Text className="mt-3 text-sm font-semibold text-slate-700">No exams found</Text>
                <Text className="mt-1 text-center text-xs text-slate-400">
                  {selectedCourseId || selectedStatus !== "ALL"
                    ? "No exams match the selected filters."
                    : "Schedule the first exam for a course."}
                </Text>
                <View className="mt-4 w-40">
                  <Button title="Schedule Exam" onPress={openCreate} />
                </View>
              </View>
            ) : (
              <View className="mt-4 gap-3">
                {filteredExams.map((exam) => {
                  const course = courseMap.get(exam.courseId);
                  const isClosed = exam.status === ExamStatus.CLOSED;
                  return (
                    <View key={exam.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <View className="flex-row items-center justify-between">
                        <Text className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">
                          {course ? `${course.code} · ${course.name}` : "Course"}
                        </Text>
                        <Text className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass(exam.status)}`}>
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
                          <Text className="text-xs font-medium text-slate-500">{exam.examDate.slice(0, 10)}</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                          <Text className="text-xs font-medium text-slate-500">{exam.duration} mins</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="ribbon-outline" size={14} color={colors.textMuted} />
                          <Text className="text-xs font-medium text-slate-500">{exam.totalMarks} Marks</Text>
                        </View>
                      </View>
                      {!isClosed ? (
                        <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
                          <Pressable
                            onPress={() => openGrading(exam)}
                            className="flex-row items-center gap-1 rounded-lg bg-sky-50 px-3 py-1.5"
                          >
                            <Ionicons name="checkbox-outline" size={14} color={colors.primary} />
                            <Text className="text-xs font-semibold text-sky-700">Grade Submissions</Text>
                          </Pressable>
                          <View className="flex-row items-center gap-2">
                            <Pressable
                              onPress={() => openEdit(exam)}
                              className="flex-row items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5"
                            >
                              <Ionicons name="pencil" size={12} color={colors.textMuted} />
                              <Text className="text-xs font-medium text-slate-700">Edit</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleDelete(exam)}
                              className="flex-row items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5"
                            >
                              <Ionicons name="trash-outline" size={12} color="#EF4444" />
                              <Text className="text-xs font-medium text-red-600">Delete</Text>
                            </Pressable>
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

      <ExamFormSheet
        visible={formSheetVisible}
        exam={editingExam}
        courses={courses}
        defaultCourseId={selectedCourseId ?? undefined}
        onClose={() => setFormSheetVisible(false)}
        onSaved={async () => {
          setFormSheetVisible(false);
          await loadData();
        }}
      />
      <ExamGradingSheet
        visible={gradingSheetVisible}
        exam={gradingExam}
        course={activeGradingCourse}
        onClose={() => setGradingSheetVisible(false)}
        onSaved={loadData}
      />
    </Screen>
  );
}
