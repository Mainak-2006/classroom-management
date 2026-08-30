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
import CourseCard from "../../components/CourseCard";
import CourseFormSheet from "../../components/CourseFormSheet";
import ProfileEditSheet from "../../components/ProfileEditSheet";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { getApiErrorMessage } from "../../lib/api/client";
import { courseService } from "../../lib/api/course";
import { studentService } from "../../lib/api/student";
import { teacherService } from "../../lib/api/teacher";
import type { Course, Student } from "../../lib/types";

interface StudentAddSheetProps {
  visible: boolean;
  course: Course | null;
  onClose: () => void;
  onChanged: () => void;
}

function StudentAddSheet({ visible, course, onClose, onChanged }: StudentAddSheetProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const enrolledIds = useMemo(
    () => new Set((course?.students ?? []).map((student) => student.id)),
    [course],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await studentService.listEnrollable();
      setStudents(data);
      setError(null);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && course) {
      const run = async () => {
        await load();
      };
      void run();
    }
  }, [visible, course, load]);

  const handleToggle = async (student: Student) => {
    if (!course || savingId) return;
    setSavingId(student.id);
    const isEnrolled = enrolledIds.has(student.id);
    try {
      if (isEnrolled) {
        await courseService.removeStudent(course.id, student.id);
      } else {
        await courseService.addStudent(course.id, student.id);
      }
      onChanged();
    } catch (toggleError) {
      setError(getApiErrorMessage(toggleError));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ProfileEditSheet visible={visible} onClose={onClose}>
      <Text className="mb-1 text-lg font-bold text-slate-900">Students</Text>
      <Text className="mb-4 text-sm text-slate-500">
        {course?.name} · {course?.code}
      </Text>

      {loading ? (
        <View className="py-16 items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View className="items-center py-8">
          <Text className="text-sm text-slate-500">{error}</Text>
          <View className="mt-4 w-40">
            <Button title="Retry" onPress={load} />
          </View>
        </View>
      ) : (
        <View className="pb-6">
          {students.map((student) => {
            const enrolled = enrolledIds.has(student.id);
            const saving = savingId === student.id;
            return (
              <Pressable
                key={student.id}
                onPress={() => handleToggle(student)}
                disabled={saving}
                className="mb-2 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold text-slate-900">
                    {student.firstName} {student.lastName}
                  </Text>
                  <Text className="mt-0.5 text-xs text-slate-500">
                    {student.rollNumber} · Semester {student.semester}
                  </Text>
                </View>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons
                    name={enrolled ? "checkbox" : "square-outline"}
                    size={22}
                    color={enrolled ? colors.primary : colors.border}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </ProfileEditSheet>
  );
}

export default function TeacherCoursesScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [studentCourse, setStudentCourse] = useState<Course | null>(null);

  const load = useCallback(async () => {
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
      await load();
    };
    void run();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleChanged = async () => {
    setShowCreate(false);
    setStudentCourse(null);
    await load();
  };

  const sorted = useMemo(
    () => [...courses].sort((a, b) => a.name.localeCompare(b.name)),
    [courses],
  );

  const totalStudents = sorted.reduce(
    (sum, course) => sum + (course.students?.length ?? 0),
    0,
  );

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-slate-900">My Courses</Text>
          <Pressable
            onPress={() => setShowCreate(true)}
            className="flex-row items-center gap-1 rounded-full px-3.5 py-2"
            style={{ backgroundColor: colors.primary }}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text className="text-sm font-semibold text-white">New Course</Text>
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
              <Button title="Retry" onPress={load} />
            </View>
          </View>
        ) : courses.length === 0 ? (
          <View className="mt-20 items-center">
            <Text className="text-sm text-slate-500">
              You are not assigned to any courses yet. Create your first course to get started.
            </Text>
          </View>
        ) : (
          <View>
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-2xl font-bold text-slate-900">{courses.length}</Text>
                <Text className="text-xs text-slate-500">Courses taught</Text>
              </View>
              <View className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-2xl font-bold text-slate-900">{totalStudents}</Text>
                <Text className="text-xs text-slate-500">Total students</Text>
              </View>
            </View>

            <View className="mt-6 gap-3">
              {sorted.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  showStudentCount
                  action={
                    <Pressable
                      onPress={() => setStudentCourse(course)}
                      className="flex-row items-center justify-center gap-1 rounded-lg border border-slate-200 py-2.5"
                    >
                      <Ionicons name="person-add" size={16} color={colors.primary} />
                      <Text className="text-sm font-semibold text-sky-600">Add Students</Text>
                    </Pressable>
                  }
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <CourseFormSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleChanged}
      />
      <StudentAddSheet
        visible={studentCourse !== null}
        course={studentCourse}
        onClose={() => setStudentCourse(null)}
        onChanged={handleChanged}
      />
    </Screen>
  );
}