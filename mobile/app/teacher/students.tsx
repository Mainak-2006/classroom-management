import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import Screen from "../../components/Screen";
import StudentDetailSheet from "../../components/StudentDetailSheet";
import { colors } from "../../constants/theme";
import { getApiErrorMessage } from "../../lib/api/client";
import { teacherService } from "../../lib/api/teacher";
import type { Course, Student } from "../../lib/types";

interface EnrolledStudentItem {
  student: Student;
  courses: Course[];
}

export default function TeacherStudentsScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal sheet
  const [selectedStudentItem, setSelectedStudentItem] = useState<EnrolledStudentItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const courseList = await teacherService.getCourses();
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

  // Group all students with their enrolled courses
  const allStudentsMap = useMemo(() => {
    const map = new Map<string, EnrolledStudentItem>();
    for (const course of courses) {
      for (const student of course.students ?? []) {
        const existing = map.get(student.id);
        if (existing) {
          existing.courses.push(course);
        } else {
          map.set(student.id, {
            student,
            courses: [course],
          });
        }
      }
    }
    return map;
  }, [courses]);

  const allStudentItems = useMemo(
    () => Array.from(allStudentsMap.values()),
    [allStudentsMap],
  );

  // Filtered students by course and search query
  const filteredStudents = useMemo(() => {
    return allStudentItems.filter((item) => {
      // Course filter
      if (selectedCourseId) {
        const isInCourse = item.courses.some((c) => c.id === selectedCourseId);
        if (!isInCourse) return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const s = item.student;
      const fullName = `${s.firstName} ${s.middleName ?? ""} ${s.lastName}`.toLowerCase();
      const roll = (s.rollNumber ?? "").toLowerCase();
      const reg = (s.registrationNumber ?? "").toLowerCase();
      const email = (s.email ?? "").toLowerCase();

      return fullName.includes(q) || roll.includes(q) || reg.includes(q) || email.includes(q);
    });
  }, [allStudentItems, selectedCourseId, searchQuery]);

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-slate-900">Students</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Roster of students across all your courses
        </Text>

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
              No courses assigned yet. Create courses and enroll students to see them here.
            </Text>
          </View>
        ) : (
          <View className="mt-4 pb-28">
            {/* Search Input */}
            <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name, roll no, or email..."
                placeholderTextColor={colors.textMuted}
                className="ml-2.5 flex-1 text-sm text-slate-900"
                autoCapitalize="none"
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* Course Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3 flex-grow-0"
            >
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
                    All Courses ({allStudentItems.length})
                  </Text>
                </Pressable>
                {courses.map((course) => {
                  const isSelected = selectedCourseId === course.id;
                  const enrolledCount = (course.students ?? []).length;
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
                        {course.code} ({enrolledCount})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Roster Stats Chip */}
            <View className="mt-4 flex-row items-center justify-between px-1">
              <Text className="text-xs font-semibold text-slate-500">
                Showing {filteredStudents.length} of {allStudentItems.length} students
              </Text>
              {selectedCourseId ? (
                <Pressable onPress={() => setSelectedCourseId(null)}>
                  <Text className="text-xs font-semibold text-sky-600">Clear filter</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Students List */}
            {filteredStudents.length === 0 ? (
              <View className="mt-12 items-center rounded-xl border border-slate-200 bg-white p-8">
                <Ionicons name="people-outline" size={40} color={colors.textMuted} />
                <Text className="mt-3 text-sm font-semibold text-slate-700">No students found</Text>
                <Text className="mt-1 text-center text-xs text-slate-400">
                  {searchQuery
                    ? `No students matching "${searchQuery}" in selected courses.`
                    : "No students are enrolled in this course yet."}
                </Text>
              </View>
            ) : (
              <View className="mt-3 gap-3">
                {filteredStudents.map(({ student, courses: studentCourses }) => {
                  const fullName = [student.firstName, student.middleName, student.lastName]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <Pressable
                      key={student.id}
                      onPress={() =>
                        setSelectedStudentItem({ student, courses: studentCourses })
                      }
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 flex-row items-center gap-3 pr-2">
                          <Avatar name={fullName} size={44} />
                          <View className="flex-1">
                            <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                              {fullName}
                            </Text>
                            <Text className="mt-0.5 text-xs text-slate-500">
                              Roll: {student.rollNumber} · Sem {student.semester}
                            </Text>
                            <Text className="text-[11px] text-slate-400">
                              Reg: {student.registrationNumber}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      </View>

                      {/* Course badges */}
                      <View className="mt-3 flex-row flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                        {studentCourses.map((c) => (
                          <Text
                            key={c.id}
                            className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700"
                          >
                            {c.code}
                          </Text>
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Student Details Modal Sheet */}
      <StudentDetailSheet
        visible={selectedStudentItem !== null}
        student={selectedStudentItem?.student ?? null}
        enrolledCourses={selectedStudentItem?.courses ?? []}
        onClose={() => setSelectedStudentItem(null)}
      />
    </Screen>
  );
}