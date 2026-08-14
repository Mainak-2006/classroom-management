import type { ReactNode } from "react";
import { Text, View } from "react-native";

import type { Course } from "../lib/types";

interface CourseCardProps {
  course: Course;
  showTeacher?: boolean;
  showStudentCount?: boolean;
  showDepartment?: boolean;
  action?: ReactNode;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text className="text-sm font-medium text-slate-800">{value}</Text>
    </View>
  );
}

export default function CourseCard({
  course,
  showTeacher = false,
  showStudentCount = false,
  showDepartment = false,
  action,
}: CourseCardProps) {
  const teacherName = course.teacher
    ? `${course.teacher.firstName} ${course.teacher.lastName}`
    : "Not assigned";

  const studentCount = course.students?.length ?? 0;

  return (
    <View className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <View className="flex-row items-baseline justify-between border-b border-slate-100 pb-2">
        <Text className="flex-1 text-sm font-semibold text-slate-900">{course.name}</Text>
        <Text className="text-xs text-slate-400">{course.code}</Text>
      </View>

      <View className="pt-2">
        {showDepartment ? <MetaRow label="Department" value={course.department} /> : null}
        <MetaRow label="Semester" value={String(course.semester)} />
        <MetaRow label="Credits" value={String(course.credits)} />
        {showTeacher ? <MetaRow label="Teacher" value={teacherName} /> : null}
        {showStudentCount ? <MetaRow label="Students" value={String(studentCount)} /> : null}
      </View>

      {action ? <View className="mt-2 border-t border-slate-100 pt-3">{action}</View> : null}
    </View>
  );
}