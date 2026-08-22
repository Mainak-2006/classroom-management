import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import Button from "./Button";
import FormInput from "./FormInput";
import ProfileEditSheet from "./ProfileEditSheet";
import { colors } from "../constants/theme";
import { getApiErrorMessage } from "../lib/api/client";
import { examService } from "../lib/api/exam";
import type { Course, CreateExamDto, Exam, UpdateExamDto } from "../lib/types";
import { ExamStatus } from "../lib/types";

interface ExamFormSheetProps {
  visible: boolean;
  exam?: Exam | null;
  courses: Course[];
  defaultCourseId?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  courseId: string;
  title: string;
  description: string;
  instructions: string;
  examDate: string;
  duration: string;
  totalMarks: string;
  status: ExamStatus;
}

const STATUSES: { value: ExamStatus; label: string }[] = [
  { value: ExamStatus.PUBLISHED, label: "Published" },
  { value: ExamStatus.DRAFT, label: "Draft" },
  { value: ExamStatus.CLOSED, label: "Closed" },
];

function ExamFormContent({
  exam,
  courses,
  defaultCourseId,
  onClose,
  onSaved,
}: Omit<ExamFormSheetProps, "visible">) {
  const isEditing = Boolean(exam);

  const [form, setForm] = useState<FormState>(() => ({
    courseId: exam?.courseId ?? defaultCourseId ?? courses[0]?.id ?? "",
    title: exam?.title ?? "",
    description: exam?.description ?? "",
    instructions: exam?.instructions ?? "",
    examDate: exam?.examDate
      ? exam.examDate.slice(0, 10)
      : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    duration: exam?.duration ? String(exam.duration) : "90",
    totalMarks: exam?.totalMarks ? String(exam.totalMarks) : "100",
    status: exam?.status ?? ExamStatus.PUBLISHED,
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): string | null => {
    if (!form.courseId) return "Please select a course.";
    if (!form.title.trim()) return "Exam title is required.";
    const duration = Number(form.duration);
    if (!form.duration.trim() || !Number.isInteger(duration) || duration <= 0) {
      return "Duration must be a positive number of minutes.";
    }
    const marks = Number(form.totalMarks);
    if (!form.totalMarks.trim() || Number.isNaN(marks) || marks <= 0) {
      return "Total marks must be a positive number.";
    }
    if (!form.examDate.trim()) return "Exam date is required.";
    const parsedDate = new Date(form.examDate.trim());
    if (Number.isNaN(parsedDate.getTime())) {
      return "Exam date must be in YYYY-MM-DD format.";
    }
    return null;
  };

  const handleSubmit = async () => {
    if (saving) return;
    const errorMsg = validate();
    if (errorMsg) {
      setFormError(errorMsg);
      return;
    }

    setSaving(true);
    setFormError(null);

    const duration = Number(form.duration.trim());
    const marks = Number(form.totalMarks.trim());
    const isoExamDate = form.examDate.includes("T")
      ? form.examDate
      : new Date(`${form.examDate}T09:00:00.000Z`).toISOString();

    try {
      if (isEditing && exam) {
        const updateDto: UpdateExamDto = {
          courseId: form.courseId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          instructions: form.instructions.trim() || undefined,
          examDate: isoExamDate,
          duration,
          totalMarks: marks,
          status: form.status,
        };
        await examService.update(exam.id, updateDto);
      } else {
        const createDto: CreateExamDto = {
          courseId: form.courseId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          instructions: form.instructions.trim() || undefined,
          examDate: isoExamDate,
          duration,
          totalMarks: marks,
          status: form.status,
          isActive: true,
        };
        await examService.create(createDto);
      }
      onSaved();
    } catch (saveError) {
      setFormError(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      <Text className="mb-1 text-lg font-bold text-slate-900">
        {isEditing ? "Edit Exam" : "Schedule Exam"}
      </Text>
      <Text className="mb-4 text-xs text-slate-500">
        {isEditing ? "Update exam schedule and settings" : "Create a new exam for your course"}
      </Text>

      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Course
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 flex-grow-0">
        <View className="flex-row gap-2">
          {courses.map((c) => {
            const isSelected = form.courseId === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setField("courseId", c.id)}
                className="rounded-full px-3 py-1.5"
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
                  {c.code} · {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <FormInput
        label="Exam Title"
        placeholder="e.g. End Term Examination - Algorithms"
        value={form.title}
        onChangeText={(val) => setField("title", val)}
        editable={!saving}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormInput
            label="Exam Date (YYYY-MM-DD)"
            placeholder="2026-09-15"
            value={form.examDate}
            onChangeText={(val) => setField("examDate", val)}
            editable={!saving}
          />
        </View>
        <View className="w-24">
          <FormInput
            label="Duration (min)"
            placeholder="90"
            value={form.duration}
            onChangeText={(val) => setField("duration", val)}
            keyboardType="number-pad"
            editable={!saving}
          />
        </View>
        <View className="w-24">
          <FormInput
            label="Marks"
            placeholder="100"
            value={form.totalMarks}
            onChangeText={(val) => setField("totalMarks", val)}
            keyboardType="number-pad"
            editable={!saving}
          />
        </View>
      </View>

      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Status
      </Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {STATUSES.map((item) => {
          const isSelected = form.status === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => setField("status", item.value)}
              className="flex-1 items-center rounded-lg py-2.5"
              style={{
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: isSelected ? colors.primary : colors.border,
              }}
            >
              <Text
                className={`text-xs font-medium ${
                  isSelected ? "font-semibold text-white" : "text-slate-600"
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FormInput
        label="Description (Optional)"
        placeholder="Topics covered and syllabus scope"
        value={form.description}
        onChangeText={(val) => setField("description", val)}
        multiline
        numberOfLines={2}
        editable={!saving}
      />

      <FormInput
        label="Instructions (Optional)"
        placeholder="Rules, allowed materials, calculator policy"
        value={form.instructions}
        onChangeText={(val) => setField("instructions", val)}
        multiline
        numberOfLines={3}
        editable={!saving}
      />

      {formError ? (
        <Text className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {formError}
        </Text>
      ) : null}

      <View className="mb-6 flex-row gap-3">
        <View className="flex-1">
          <Button title="Cancel" onPress={onClose} variant="secondary" disabled={saving} />
        </View>
        <View className="flex-1">
          <Button
            title={isEditing ? "Save Changes" : "Schedule Exam"}
            onPress={handleSubmit}
            loading={saving}
          />
        </View>
      </View>
    </View>
  );
}

export default function ExamFormSheet({
  visible,
  exam,
  courses,
  defaultCourseId,
  onClose,
  onSaved,
}: ExamFormSheetProps) {
  return (
    <ProfileEditSheet visible={visible} onClose={onClose}>
      {visible ? (
        <ExamFormContent
          key={exam?.id ?? "new"}
          exam={exam}
          courses={courses}
          defaultCourseId={defaultCourseId}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </ProfileEditSheet>
  );
}
