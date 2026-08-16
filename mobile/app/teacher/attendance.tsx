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
import { attendanceService } from "../../lib/api/attendance";
import { getApiErrorMessage } from "../../lib/api/client";
import { teacherService } from "../../lib/api/teacher";
import type { Attendance, Course, CreateAttendanceDto, Student } from "../../lib/types";
import { AttendanceStatus } from "../../lib/types";

const TODAY = new Date().toISOString().slice(0, 10);

const STATUS_OPTIONS: { status: AttendanceStatus; label: string; selectedColor: string }[] = [
  { status: AttendanceStatus.PRESENT, label: "Present", selectedColor: "#10B981" },
  { status: AttendanceStatus.ABSENT, label: "Absent", selectedColor: "#EF4444" },
  { status: AttendanceStatus.LATE, label: "Late", selectedColor: "#F59E0B" },
  { status: AttendanceStatus.EXCUSED, label: "Excused", selectedColor: "#0EA5E9" },
];

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
  return `${weekday}, ${MONTHS[now.getMonth()]} ${day}${suffix}, ${now.getFullYear()}`;
}

export default function TeacherAttendanceScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const [records, setRecords] = useState<Attendance[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );
  const students = selectedCourse?.students ?? [];

  const loadCourses = useCallback(async () => {
    try {
      const courseList = await teacherService.getCourses();
      setCourses(courseList);
      setSelectedCourseId((previous) => previous ?? courseList[0]?.id ?? null);
      setCoursesError(null);
    } catch (fetchError) {
      setCoursesError(getApiErrorMessage(fetchError));
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadCourses();
    };
    void run();
  }, [loadCourses]);

  const loadRoster = useCallback(async () => {
    if (!selectedCourseId) return;

    try {
      const existing = await attendanceService.byCourseAndDate(selectedCourseId, TODAY);
      const course = courses.find((c) => c.id === selectedCourseId);
      const roster = course?.students ?? [];

      const existingByStudent = new Map(existing.map((record) => [record.studentId, record]));
      const nextStatuses: Record<string, AttendanceStatus> = {};
      for (const student of roster) {
        nextStatuses[student.id] =
          existingByStudent.get(student.id)?.status ?? AttendanceStatus.PRESENT;
      }

      setRecords(existing);
      setStatuses(nextStatuses);
      setRosterError(null);
      setFeedback(null);
    } catch (fetchError) {
      setRosterError(getApiErrorMessage(fetchError));
    } finally {
      setRosterLoading(false);
    }
  }, [selectedCourseId, courses]);

  useEffect(() => {
    const run = async () => {
      await loadRoster();
    };
    void run();
  }, [loadRoster]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCourses();
      await loadRoster();
    } finally {
      setRefreshing(false);
    }
  };

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setFeedback(null);
    setStatuses((previous) => ({ ...previous, [studentId]: status }));
  };

  const handleSelectCourse = (courseId: string) => {
    if (courseId === selectedCourseId) return;
    setSelectedCourseId(courseId);
    setRosterLoading(true);
    setFeedback(null);
  };

  const summary = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    for (const status of Object.values(statuses)) {
      if (status === AttendanceStatus.PRESENT) present += 1;
      if (status === AttendanceStatus.ABSENT) absent += 1;
      if (status === AttendanceStatus.LATE) late += 1;
      if (status === AttendanceStatus.EXCUSED) excused += 1;
    }
    return { present, absent, late, excused };
  }, [statuses]);

  const handleSave = async () => {
    if (!selectedCourseId || saving) return;

    const existingByStudent = new Map(records.map((record) => [record.studentId, record]));
    const toCreate: CreateAttendanceDto[] = [];
    const toUpdate: { id: string; status: AttendanceStatus }[] = [];

    for (const [studentId, status] of Object.entries(statuses)) {
      const existing = existingByStudent.get(studentId);
      if (!existing) {
        toCreate.push({ studentId, courseId: selectedCourseId, date: TODAY, status });
      } else if (existing.status !== status) {
        toUpdate.push({ id: existing.id, status });
      }
    }

    if (toCreate.length === 0 && toUpdate.length === 0) {
      setFeedback({ kind: "success", text: "No changes to save." });
      return;
    }

    setSaving(true);
    try {
      if (toCreate.length > 0) {
        await attendanceService.createBulk(toCreate);
      }
      await Promise.all(toUpdate.map((entry) => attendanceService.update(entry.id, { status: entry.status })));
      await loadRoster();
      setFeedback({
        kind: "success",
        text: `Saved ${toCreate.length + toUpdate.length} attendance record(s).`,
      });
    } catch (saveError) {
      setFeedback({ kind: "error", text: getApiErrorMessage(saveError) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-slate-900">Attendance</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Mark today&apos;s attendance · {formatToday()}
        </Text>

        {coursesLoading ? (
          <View className="mt-20 items-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : coursesError ? (
          <View className="mt-20 items-center">
            <Text className="text-sm text-slate-500">{coursesError}</Text>
            <View className="mt-4 w-40">
              <Button title="Retry" onPress={loadCourses} />
            </View>
          </View>
        ) : courses.length === 0 ? (
          <View className="mt-20 items-center">
            <Text className="text-sm text-slate-500">
              You are not assigned to any courses yet. Attendance can be marked once you have a
              course.
            </Text>
          </View>
        ) : (
          <View>
            <Text className="mt-6 mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Course
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
              <View className="flex-row gap-2">
                {courses.map((course) => {
                  const selected = course.id === selectedCourseId;
                  return (
                    <Pressable
                      key={course.id}
                      onPress={() => handleSelectCourse(course.id)}
                      className="rounded-full px-3.5 py-2"
                      style={{
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderWidth: 1,
                        borderColor: selected ? colors.primary : colors.border,
                      }}
                    >
                      <Text
                        className="text-sm font-medium"
                        style={{ color: selected ? "#FFFFFF" : colors.textMuted }}
                      >
                        {course.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {rosterLoading ? (
              <View className="mt-16 items-center">
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : rosterError ? (
              <View className="mt-16 items-center">
                <Text className="text-sm text-slate-500">{rosterError}</Text>
                <View className="mt-4 w-40">
                  <Button title="Retry" onPress={loadRoster} />
                </View>
              </View>
            ) : students.length === 0 ? (
              <View className="mt-16 items-center">
                <Text className="text-sm text-slate-500">
                  No students are enrolled in this course.
                </Text>
              </View>
            ) : (
              <View>
                <View className="mt-6 flex-row gap-3">
                  <View className="flex-1 rounded-xl border border-slate-200 bg-white p-3">
                    <Text className="text-lg font-bold text-emerald-600">
                      {summary.present}
                    </Text>
                    <Text className="text-xs text-slate-500">Present</Text>
                  </View>
                  <View className="flex-1 rounded-xl border border-slate-200 bg-white p-3">
                    <Text className="text-lg font-bold text-amber-600">{summary.late}</Text>
                    <Text className="text-xs text-slate-500">Late</Text>
                  </View>
                  <View className="flex-1 rounded-xl border border-slate-200 bg-white p-3">
                    <Text className="text-lg font-bold text-red-600">{summary.absent}</Text>
                    <Text className="text-xs text-slate-500">Absent</Text>
                  </View>
                  <View className="flex-1 rounded-xl border border-slate-200 bg-white p-3">
                    <Text className="text-lg font-bold text-sky-600">{summary.excused}</Text>
                    <Text className="text-xs text-slate-500">Excused</Text>
                  </View>
                </View>

                <Text className="mt-6 mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Students ({students.length})
                </Text>
                <View className="gap-3">
                  {students.map((student: Student) => {
                    const current = statuses[student.id] ?? AttendanceStatus.PRESENT;
                    const fullName = [student.firstName, student.middleName, student.lastName]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <View
                        key={student.id}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <View className="flex-row items-center gap-3">
                          <Avatar name={fullName} size={40} />
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-slate-900">
                              {fullName}
                            </Text>
                            <Text className="text-xs text-slate-400">{student.rollNumber}</Text>
                          </View>
                        </View>
                        <View className="mt-3 flex-row gap-2">
                          {STATUS_OPTIONS.map((option) => {
                            const active = current === option.status;
                            return (
                              <Pressable
                                key={option.status}
                                onPress={() => setStatus(student.id, option.status)}
                                className="flex-1 items-center rounded-lg py-2"
                                style={{
                                  backgroundColor: active
                                    ? option.selectedColor
                                    : colors.surface,
                                  borderWidth: 1,
                                  borderColor: active ? option.selectedColor : colors.border,
                                }}
                              >
                                <Text
                                  className={`text-xs font-medium ${
                                    active ? "font-semibold text-white" : "text-slate-500"
                                  }`}
                                >
                                  {option.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {feedback ? (
                  <Text
                    className={`mt-4 rounded-lg p-3 text-sm ${
                      feedback.kind === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {feedback.text}
                  </Text>
                ) : null}

                <View className="mt-4 mb-28">
                  <Button title="Save Attendance" onPress={handleSave} loading={saving} />
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}