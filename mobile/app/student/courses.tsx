import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import Button from "../../components/Button";
import CourseCard from "../../components/CourseCard";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { getApiErrorMessage } from "../../lib/api/client";
import { studentService } from "../../lib/api/student";
import type { Course } from "../../lib/types";

export default function StudentCoursesScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const courseList = await studentService.getCourses();
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

  const sorted = useMemo(
    () => [...courses].sort((a, b) => a.name.localeCompare(b.name)),
    [courses],
  );

  const totalCredits = useMemo(
    () => courses.reduce((sum, course) => sum + course.credits, 0),
    [courses],
  );

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-slate-900">Courses</Text>

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
              You are not enrolled in any courses yet. Courses will appear here once you are
              enrolled.
            </Text>
          </View>
        ) : (
          <View>
            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-2xl font-bold text-slate-900">{courses.length}</Text>
                <Text className="text-xs text-slate-500">Enrolled courses</Text>
              </View>
              <View className="flex-1 rounded-xl border border-slate-200 bg-white p-4">
                <Text className="text-2xl font-bold text-slate-900">{totalCredits}</Text>
                <Text className="text-xs text-slate-500">Total credits</Text>
              </View>
            </View>

            <View className="mt-6 gap-3">
              {sorted.map((course) => (
                <CourseCard key={course.id} course={course} showTeacher />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}