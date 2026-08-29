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
import { examService } from "../../lib/api/exam";
import { teacherService } from "../../lib/api/teacher";
import type { Course, Exam } from "../../lib/types";
import { ExamStatus } from "../../lib/types";

const STATUS_FILTERS: { value: ExamStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: ExamStatus.PUBLISHED, label: "Published" },
  { value: ExamStatus.DRAFT, label: "Draft" },
  { value: ExamStatus.CLOSED, label: "Closed" },
];

export default function TeacherExamsScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ExamStatus | "ALL">("ALL");

  // Sheet modals
  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [gradingSheetVisible, setGradingSheetVisible] = useState(false);
  const [gradingExam, setGradingExam] = useState<Exam | null>(null);

  const loadData = useCallback(async () => {
    try {
      const courseList = await teacherService.getCourses();
      setCourses(courseList);

      if (courseList.length > 0) {
        const promises = courseList.map((c) =>
          examService.byCourse(c.id).catch(() => [] as Exam[]),
        );
        const results = await Promise.all(promises);
        setExams(results.flat());
      } else {
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

  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    for (const c of courses) {
      map.set(c.id, c);
    }
    return map;
  }, [courses]);

  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (selectedCourseId && e.courseId !== selectedCourseId) return false;
      if (selectedStatus !== "ALL" && e.status !== selectedStatus) return false;
      return true;
    });
  }, [exams, selectedCourseId, selectedStatus]);

  const handleOpenCreate = () => {
    setEditingExam(null);
    setFormSheetVisible(true);
  };

  const handleOpenEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormSheetVisible(true);
  };

  const handleOpenGrading = (exam: Exam) => {
    setGradingExam(exam);
    setGradingSheetVisible(true);
  };

  const handleDelete = (exam: Exam) => {
    Alert.alert(
      "Delete Exam",
      `Are you sure you want to delete "${exam.title}"?`,
      [
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
      ],
    );
  };

  const activeGradingCourse = useMemo(() => {
    if (!gradingExam) return null;
    return courseMap.get(gradingExam.courseId) ?? null;
  }, [gradingExam, courseMap]);

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-2xl font-bold text-slate-900">Exams</Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              Schedule exams & evaluate student grades
            </Text>
          </View>
          <Pressable
            onPress={handleOpenCreate}
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
            <Text className="text-sm text-slate-500">
              No active courses found. Create a course first before scheduling exams.
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
            {filteredExams.length === 0 ? (
              <View className="mt-12 items-center rounded-xl border border-slate-200 bg-white p-8">
                <Ionicons name="school-outline" size={40} color={colors.textMuted} />
                <Text className="mt-3 text-sm font-semibold text-slate-700">No exams found</Text>
                <Text className="mt-1 text-center text-xs text-slate-400">
                  {selectedCourseId || selectedStatus !== "ALL"
                    ? "No exams matching the selected filters."
                    : "You have not scheduled any exams yet."}
                </Text>
                <View className="mt-4 w-40">
                  <Button title="Schedule Exam" onPress={handleOpenCreate} />
                </View>
              </View>
            ) : (
              <View className="mt-4 gap-3">
                {filteredExams.map((exam) => {
                  const course = courseMap.get(exam.courseId);
                  const isClosed = exam.status === ExamStatus.CLOSED;

                  const statusColor =
                    exam.status === ExamStatus.PUBLISHED
                      ? "bg-emerald-100 text-emerald-800"
                      : exam.status === ExamStatus.DRAFT
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-800";

                  return (
                    <View
                      key={exam.id}
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
                            {exam.examDate.slice(0, 10)}
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
                      </View>

                      <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
                        <Pressable
                          onPress={() => handleOpenGrading(exam)}
                          className="flex-row items-center gap-1 rounded-lg bg-sky-50 px-3 py-1.5"
                        >
                          <Ionicons name="checkbox-outline" size={14} color={colors.primary} />
                          <Text className="text-xs font-semibold text-sky-700">
                            Grade Submissions
                          </Text>
                        </Pressable>

                        {!isClosed ? (
                          <View className="flex-row items-center gap-2">
                            <Pressable
                              onPress={() => handleOpenEdit(exam)}
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
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Exam Form Sheet (Create/Edit) */}
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

      {/* Exam Grading Sheet */}
      <ExamGradingSheet
        visible={gradingSheetVisible}
        exam={gradingExam}
        course={activeGradingCourse}
        onClose={() => setGradingSheetVisible(false)}
        onSaved={async () => {
          await loadData();
        }}
      />
    </Screen>
  );
}
