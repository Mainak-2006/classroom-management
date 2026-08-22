import { View, Text } from "react-native";

import Avatar from "./Avatar";
import Button from "./Button";
import ProfileEditSheet from "./ProfileEditSheet";
import ProfileRow from "./ProfileRow";
import ProfileSection from "./ProfileSection";
import type { Course, Student } from "../lib/types";

interface StudentDetailSheetProps {
  visible: boolean;
  student: Student | null;
  enrolledCourses?: Course[];
  onClose: () => void;
}

export default function StudentDetailSheet({
  visible,
  student,
  enrolledCourses = [],
  onClose,
}: StudentDetailSheetProps) {
  if (!student) return null;

  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");

  const genderLabel = student.gender
    ? student.gender.charAt(0) + student.gender.slice(1).toLowerCase()
    : undefined;

  return (
    <ProfileEditSheet visible={visible} onClose={onClose}>
      <View className="items-center rounded-xl border border-slate-200 bg-white p-6">
        <Avatar name={fullName} size={64} />
        <Text className="mt-3 text-lg font-bold text-slate-900">{fullName}</Text>
        <View className="mt-1 flex-row items-center gap-2">
          <Text className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            STUDENT
          </Text>
          <Text className="text-xs font-medium text-slate-500">
            Roll: {student.rollNumber}
          </Text>
        </View>
      </View>

      <ProfileSection title="Academic Information">
        <ProfileRow label="Department" value={student.department} />
        <ProfileRow label="Semester" value={`Semester ${student.semester}`} />
        <ProfileRow label="Section" value={student.section ?? undefined} />
        <ProfileRow label="Roll Number" value={student.rollNumber} />
        <ProfileRow label="Registration No." value={student.registrationNumber} />
      </ProfileSection>

      {enrolledCourses.length > 0 ? (
        <View className="mt-6">
          <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Enrolled Courses ({enrolledCourses.length})
          </Text>
          <View className="gap-2">
            {enrolledCourses.map((course) => (
              <View
                key={course.id}
                className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-sm font-semibold text-slate-900">{course.name}</Text>
                  <Text className="text-xs text-slate-500">
                    {course.code} · Sem {course.semester} · {course.credits} Credits
                  </Text>
                </View>
                <Text className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-600">
                  Enrolled
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <ProfileSection title="Personal & Contact">
        <ProfileRow label="Email" value={student.email} />
        <ProfileRow label="Phone" value={student.phone} />
        <ProfileRow label="Date of Birth" value={student.dateOfBirth?.slice(0, 10)} />
        <ProfileRow label="Gender" value={genderLabel} />
      </ProfileSection>

      {(student.guardianName || student.guardianPhone || student.address) ? (
        <ProfileSection title="Guardian & Address">
          <ProfileRow label="Guardian Name" value={student.guardianName ?? undefined} />
          <ProfileRow label="Guardian Phone" value={student.guardianPhone ?? undefined} />
          <ProfileRow label="Address" value={student.address ?? undefined} />
        </ProfileSection>
      ) : null}

      <View className="mt-6 mb-8">
        <Button title="Close" onPress={onClose} variant="secondary" />
      </View>
    </ProfileEditSheet>
  );
}
