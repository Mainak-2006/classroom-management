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

import AssignmentFormSheet from "../../components/AssignmentFormSheet";
import AssignmentGradingSheet from "../../components/AssignmentGradingSheet";
import Button from "../../components/Button";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { assignmentService } from "../../lib/api/assignment";
import { getApiErrorMessage } from "../../lib/api/client";
import { teacherService } from "../../lib/api/teacher";
import type { Assignment, Course } from "../../lib/types";
import { AssignmentStatus } from "../../lib/types";

const STATUS_FILTERS: { value: AssignmentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: AssignmentStatus.PUBLISHED, label: "Published" },
  { value: AssignmentStatus.CLOSED, label: "Closed" },
];

function formatDueDate(dueIso: string): { formatted: string; isOverdue: boolean; label: string } {
  const due = new Date(dueIso);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formatted = due.toISOString().slice(0, 10);
  if (diffDays < 0) {
    return { formatted, isOverdue: true, label: "Overdue" };
  }
  if (diffDays === 0) {
    return { formatted, isOverdue: false, label: "Due Today" };
  }
  if (diffDays === 1) {
    return { formatted, isOverdue: false, label: "Due Tomorrow" };
  }
  return { formatted, isOverdue: false, label: `Due in ${diffDays} days` };
}

export default function TeacherAssignmentsScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AssignmentStatus | "ALL">("ALL");

  // Sheet modals
  const [formSheetVisible, setFormSheetVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);

  const loadData = useCallback(async () => {
    try {
      const courseList = await teacherService.getCourses();
      setCourses(courseList);

      if (courseList.length > 0) {
        const promises = courseList.map((c) =>
          assignmentService.byCourse(c.id).catch(() => [] as Assignment[]),
        );
        const results = await Promise.all(promises);
        setAssignments(results.flat());
      } else {
        setAssignments([]);
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

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (selectedCourseId && a.courseId !== selectedCourseId) return false;
      if (selectedStatus !== "ALL" && a.status !== selectedStatus) return false;
      return true;
    });
  }, [assignments, selectedCourseId, selectedStatus]);

  const handleOpenCreate = () => {
    setEditingAssignment(null);
    setFormSheetVisible(true);
  };

  const handleOpenEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setFormSheetVisible(true);
  };

  const handleDelete = (assignment: Assignment) => {
    Alert.alert(
      "Delete Assignment",
      `Are you sure you want to delete "${assignment.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await assignmentService.remove(assignment.id);
              await loadData();
            } catch (deleteError) {
              Alert.alert("Delete Failed", getApiErrorMessage(deleteError));
            }
          },
        },
      ],
    );
  };

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
            <Text className="text-2xl font-bold text-slate-900">Assignments</Text>
            <Text className="mt-0.5 text-xs text-slate-500">
              Manage coursework, deadlines & submissions
            </Text>
          </View>
          <Pressable
            onPress={handleOpenCreate}
            disabled={courses.length === 0}
            className="flex-row items-center gap-1 rounded-full px-3.5 py-2"
            style={{ backgroundColor: courses.length === 0 ? colors.border : colors.primary }}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="text-sm font-semibold text-white">New</Text>
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
              You do not have any active courses. Create a course first before assigning tasks.
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

            {/* Assignments List */}
            {filteredAssignments.length === 0 ? (
              <View className="mt-12 items-center rounded-xl border border-slate-200 bg-white p-8">
                <Ionicons name="document-text-outline" size={40} color={colors.textMuted} />
                <Text className="mt-3 text-sm font-semibold text-slate-700">No assignments found</Text>
                <Text className="mt-1 text-center text-xs text-slate-400">
                  {selectedCourseId || selectedStatus !== "ALL"
                    ? "No assignments matching the selected filters."
                    : "You haven't created any assignments yet."}
                </Text>
                <View className="mt-4 w-44">
                  <Button title="Create Assignment" onPress={handleOpenCreate} />
                </View>
              </View>
            ) : (
              <View className="mt-4 gap-3">
                {filteredAssignments.map((assignment) => {
                  const course = courseMap.get(assignment.courseId);
                  const dueInfo = formatDueDate(assignment.dueDate);
                  const isClosed = assignment.status === AssignmentStatus.CLOSED;

                  const statusBg =
                    assignment.status === AssignmentStatus.PUBLISHED
                      ? "bg-emerald-100 text-emerald-800"
                      : assignment.status === AssignmentStatus.DRAFT
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700";

                  return (
                    <View
                      key={assignment.id}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">
                          {course ? `${course.code} · ${course.name}` : "Course"}
                        </Text>
                        <Text className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBg}`}>
                          {assignment.status}
                        </Text>
                      </View>

                      <Text className="mt-2 text-base font-bold text-slate-900">
                        {assignment.title}
                      </Text>

                      {assignment.description ? (
                        <Text className="mt-1 text-xs text-slate-600" numberOfLines={2}>
                          {assignment.description}
                        </Text>
                      ) : null}

                      <View className="mt-3 flex-row flex-wrap items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color={dueInfo.isOverdue ? "#EF4444" : colors.textMuted}
                          />
                          <Text
                            className={`text-xs font-medium ${
                              dueInfo.isOverdue ? "font-semibold text-red-600" : "text-slate-500"
                            }`}
                          >
                            {dueInfo.formatted} ({dueInfo.label})
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-1">
                          <Ionicons name="ribbon-outline" size={14} color={colors.textMuted} />
                          <Text className="text-xs font-medium text-slate-500">
                            {assignment.totalMarks} Marks
                          </Text>
                        </View>
                      </View>

                      {!isClosed ? (
                        <View className="mt-4 flex-row justify-end border-t border-slate-100 pt-3">
                          <View className="flex-row items-center gap-2">
                            <Pressable
                              onPress={() => setGradingAssignment(assignment)}
                              className="flex-row items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1"
                            >
                              <Ionicons name="checkmark-done-outline" size={12} color={colors.primary} />
                              <Text className="text-xs font-medium text-sky-700">Grade</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleOpenEdit(assignment)}
                              className="flex-row items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1"
                            >
                              <Ionicons name="pencil" size={12} color={colors.textMuted} />
                              <Text className="text-xs font-medium text-slate-700">Edit</Text>
                            </Pressable>

                            <Pressable
                              onPress={() => handleDelete(assignment)}
                              className="flex-row items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1"
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

      {/* Assignment Form Sheet */}
      <AssignmentFormSheet
        visible={formSheetVisible}
        assignment={editingAssignment}
        courses={courses}
        defaultCourseId={selectedCourseId ?? undefined}
        onClose={() => setFormSheetVisible(false)}
        onSaved={async () => {
          setFormSheetVisible(false);
          await loadData();
        }}
      />
      <AssignmentGradingSheet
        assignment={gradingAssignment}
        visible={Boolean(gradingAssignment)}
        onClose={() => setGradingAssignment(null)}
      />
    </Screen>
  );
}
