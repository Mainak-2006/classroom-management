import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import AttendanceStatusBadge from "../../components/AttendanceStatusBadge";
import Button from "../../components/Button";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { getApiErrorMessage } from "../../lib/api/client";
import { studentService } from "../../lib/api/student";
import type { Attendance, Course } from "../../lib/types";
import { AttendanceStatus } from "../../lib/types";

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

function formatDate(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(day)}`;
}

export default function StudentAttendanceScreen() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [attendance, courseList] = await Promise.all([
        studentService.getAttendance(),
        studentService.getCourses(),
      ]);
      setRecords(attendance);
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

  const grouped = useMemo(() => {
    const byCourse = new Map<string, Attendance[]>();
    for (const record of [...records].sort((a, b) => b.date.localeCompare(a.date))) {
      const list = byCourse.get(record.courseId) ?? [];
      list.push(record);
      byCourse.set(record.courseId, list);
    }

    return [...byCourse.entries()].map(([courseId, courseRecords]) => ({
      course: courses.find((c) => c.id === courseId),
      records: courseRecords,
    }));
  }, [records, courses]);

  const totals = useMemo(() => {
    let total = 0;
    let present = 0;
    let late = 0;
    let excused = 0;
    for (const record of records) {
      total += 1;
      if (record.status === AttendanceStatus.PRESENT) present += 1;
      if (record.status === AttendanceStatus.LATE) late += 1;
      if (record.status === AttendanceStatus.EXCUSED) excused += 1;
    }
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, late, excused, percentage };
  }, [records]);

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-slate-900">Attendance</Text>

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
        ) : records.length === 0 ? (
          <View className="mt-20 items-center">
            <Text className="text-sm text-slate-500">
              No attendance records yet. Records will appear here once your teachers mark
              attendance.
            </Text>
          </View>
        ) : (
          <View>
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-2xl font-bold text-slate-900">{totals.total}</Text>
                <Text className="text-xs text-slate-500">Total sessions</Text>
              </View>
              <View className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-2xl font-bold text-emerald-600">
                  {totals.percentage}%
                </Text>
                <Text className="text-xs text-slate-500">Present rate</Text>
              </View>
              <View className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-2xl font-bold text-slate-900">
                  {totals.present + totals.late + totals.excused}
                </Text>
                <Text className="text-xs text-slate-500">Attended</Text>
              </View>
            </View>

            {grouped.map(({ course, records: courseRecords }) => {
              const presentCount = courseRecords.filter(
                (record) => record.status === AttendanceStatus.PRESENT,
              ).length;
              const courseName = course ? course.name : "Unknown course";
              const courseCode = course ? course.code : "";

              return (
                <View
                  key={course?.id ?? courseName}
                  className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <View className="flex-row items-baseline justify-between border-b border-slate-100 pb-2">
                    <Text className="flex-1 text-sm font-semibold text-slate-900">
                      {courseName}
                    </Text>
                    {courseCode ? (
                      <Text className="text-xs text-slate-400">{courseCode}</Text>
                    ) : null}
                  </View>

                  {courseRecords.map((record) => (
                    <View
                      key={record.id}
                      className="flex-row items-center justify-between py-2.5"
                    >
                      <Text className="text-sm text-slate-700">{formatDate(record.date)}</Text>
                      <AttendanceStatusBadge status={record.status} />
                    </View>
                  ))}

                  <View className="border-t border-slate-100 pt-2">
                    <Text className="text-xs text-slate-500">
                      {presentCount}/{courseRecords.length} present
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}