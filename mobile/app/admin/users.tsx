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
import ProfileEditSheet from "../../components/ProfileEditSheet";
import Screen from "../../components/Screen";
import StudentDetailSheet from "../../components/StudentDetailSheet";
import { colors } from "../../constants/theme";
import { getApiErrorMessage } from "../../lib/api/client";
import { courseService } from "../../lib/api/course";
import { studentService } from "../../lib/api/student";
import { teacherService } from "../../lib/api/teacher";
import type { Course, Student, Teacher } from "../../lib/types";

type UserFilter = "ALL" | "STUDENTS" | "TEACHERS";

interface StudentRosterItem {
  student: Student;
  courses: Course[];
}

interface StudentEnrollmentSheetProps {
  visible: boolean;
  student: Student | null;
  courses: Course[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}

function fullName(person: Student | Teacher): string {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

function StudentEnrollmentSheet({
  visible,
  student,
  courses,
  onClose,
  onChanged,
}: StudentEnrollmentSheetProps) {
  const [savingCourseId, setSavingCourseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggleEnrollment = async (course: Course) => {
    if (!student || savingCourseId) return;
    const enrolled = course.students?.some((enrolledStudent) => enrolledStudent.id === student.id);
    setSavingCourseId(course.id);
    setError(null);
    try {
      if (enrolled) {
        await courseService.removeStudent(course.id, student.id);
      } else {
        await courseService.addStudent(course.id, student.id);
      }
      await onChanged();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSavingCourseId(null);
    }
  };

  return (
    <ProfileEditSheet visible={visible} onClose={onClose}>
      <Text className="mb-1 text-lg font-bold text-slate-900">Manage Enrollment</Text>
      <Text className="mb-4 text-xs text-slate-500">
        Add or remove {student ? fullName(student) : "this student"} from courses.
      </Text>

      {error ? <Text className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</Text> : null}

      <View className="gap-2 pb-4">
        {courses.map((course) => {
          const enrolled = course.students?.some((enrolledStudent) => enrolledStudent.id === student?.id);
          const saving = savingCourseId === course.id;
          return (
            <View key={course.id} className="flex-row items-center rounded-xl border border-slate-200 bg-white p-3.5">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-slate-900">{course.name}</Text>
                <Text className="mt-0.5 text-xs text-slate-500">
                  {course.code} · Sem {course.semester} · {course.department}
                </Text>
              </View>
              <Pressable
                onPress={() => handleToggleEnrollment(course)}
                disabled={saving}
                className="min-w-24 items-center rounded-lg px-3 py-2"
                style={{ backgroundColor: enrolled ? "#FEF2F2" : "#E0F2FE" }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text className={`text-xs font-semibold ${enrolled ? "text-red-600" : "text-sky-700"}`}>
                    {enrolled ? "Remove" : "Enroll"}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
      <View className="mb-4">
        <Button title="Done" variant="secondary" onPress={onClose} disabled={savingCourseId !== null} />
      </View>
    </ProfileEditSheet>
  );
}

export default function AdminUsersScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<UserFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRosterItem | null>(null);
  const [enrollmentStudent, setEnrollmentStudent] = useState<Student | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [studentResponse, teacherResponse, courseResponse] = await Promise.all([
        studentService.list(),
        teacherService.list(),
        courseService.list(),
      ]);
      setStudents(studentResponse.data);
      setTeachers(teacherResponse.data);
      setCourses(courseResponse.data);
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

  const studentsWithCourses = useMemo<StudentRosterItem[]>(
    () =>
      students.map((student) => ({
        student,
        courses: courses.filter((course) => course.students?.some((item) => item.id === student.id)),
      })),
    [courses, students],
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesQuery = useCallback(
    (person: Student | Teacher, identifiers: string[]) => {
      if (!normalizedQuery) return true;
      return [fullName(person), person.email, person.department, ...identifiers]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    },
    [normalizedQuery],
  );

  const visibleStudents = useMemo(
    () =>
      studentsWithCourses.filter((item) =>
        matchesQuery(item.student, [item.student.rollNumber, item.student.registrationNumber]),
      ),
    [matchesQuery, studentsWithCourses],
  );

  const visibleTeachers = useMemo(
    () => teachers.filter((teacher) => matchesQuery(teacher, [teacher.employeeId, teacher.designation])),
    [matchesQuery, teachers],
  );

  const showStudents = roleFilter === "ALL" || roleFilter === "STUDENTS";
  const showTeachers = roleFilter === "ALL" || roleFilter === "TEACHERS";
  const visibleTotal = (showStudents ? visibleStudents.length : 0) + (showTeachers ? visibleTeachers.length : 0);

  const handleEnrollmentChanged = async () => {
    await loadData();
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-slate-900">Users</Text>
        <Text className="mt-0.5 text-xs text-slate-500">
          Browse students and teachers, and manage course enrollments
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
        ) : (
          <View className="mt-4 pb-28">
            <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search name, email, ID, or department..."
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

            <View className="mt-3 flex-row gap-2">
              {([
                ["ALL", `All (${students.length + teachers.length})`],
                ["STUDENTS", `Students (${students.length})`],
                ["TEACHERS", `Teachers (${teachers.length})`],
              ] as const).map(([value, label]) => {
                const selected = roleFilter === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setRoleFilter(value)}
                    className="flex-1 items-center rounded-lg py-2"
                    style={{
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                    }}
                  >
                    <Text className={`text-xs font-medium ${selected ? "font-semibold text-white" : "text-slate-600"}`}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mt-4 px-1 text-xs font-semibold text-slate-500">
              Showing {visibleTotal} user{visibleTotal === 1 ? "" : "s"}
            </Text>

            {visibleTotal === 0 ? (
              <View className="mt-10 items-center rounded-xl border border-slate-200 bg-white p-8">
                <Ionicons name="people-outline" size={40} color={colors.textMuted} />
                <Text className="mt-3 text-sm font-semibold text-slate-700">No users found</Text>
                <Text className="mt-1 text-center text-xs text-slate-400">
                  Try a different search term or user filter.
                </Text>
              </View>
            ) : (
              <View className="mt-3 gap-5">
                {showStudents ? (
                  <View>
                    <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Students ({visibleStudents.length})
                    </Text>
                    <View className="gap-3">
                      {visibleStudents.map((item) => {
                        const name = fullName(item.student);
                        return (
                          <View key={item.student.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <Pressable onPress={() => setSelectedStudent(item)} className="flex-row items-center">
                              <Avatar name={name} size={44} />
                              <View className="ml-3 flex-1 pr-2">
                                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>{name}</Text>
                                <Text className="mt-0.5 text-xs text-slate-500">
                                  Roll: {item.student.rollNumber} · Sem {item.student.semester}
                                </Text>
                                <Text className="mt-0.5 text-[11px] text-slate-400" numberOfLines={1}>
                                  {item.student.department} · {item.courses.length} course{item.courses.length === 1 ? "" : "s"}
                                </Text>
                              </View>
                              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                            </Pressable>
                            <Pressable
                              onPress={() => setEnrollmentStudent(item.student)}
                              className="mt-3 flex-row items-center justify-center gap-1 rounded-lg border border-sky-200 bg-sky-50 py-2"
                            >
                              <Ionicons name="school-outline" size={15} color={colors.primary} />
                              <Text className="text-xs font-semibold text-sky-700">Manage Enrollment</Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {showTeachers ? (
                  <View>
                    <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Teachers ({visibleTeachers.length})
                    </Text>
                    <View className="gap-3">
                      {visibleTeachers.map((teacher) => {
                        const name = fullName(teacher);
                        const assignedCourses = courses.filter((course) => course.teacherId === teacher.id).length;
                        return (
                          <View key={teacher.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <View className="flex-row items-center">
                              <Avatar name={name} size={44} />
                              <View className="ml-3 flex-1 pr-2">
                                <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>{name}</Text>
                                <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                                  {teacher.designation} · {teacher.department}
                                </Text>
                                <Text className="mt-0.5 text-[11px] text-slate-400">
                                  {teacher.employeeId} · {assignedCourses} assigned course{assignedCourses === 1 ? "" : "s"}
                                </Text>
                              </View>
                              <Text className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${teacher.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                {teacher.isActive ? "Active" : "Inactive"}
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
          </View>
        )}
      </ScrollView>

      <StudentDetailSheet
        visible={selectedStudent !== null}
        student={selectedStudent?.student ?? null}
        enrolledCourses={selectedStudent?.courses ?? []}
        onClose={() => setSelectedStudent(null)}
      />
      <StudentEnrollmentSheet
        visible={enrollmentStudent !== null}
        student={enrollmentStudent}
        courses={courses}
        onClose={() => setEnrollmentStudent(null)}
        onChanged={handleEnrollmentChanged}
      />
    </Screen>
  );
}
