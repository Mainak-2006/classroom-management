import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import Button from "./Button";
import FormInput from "./FormInput";
import ProfileEditSheet from "./ProfileEditSheet";
import { colors } from "../constants/theme";
import { assignmentService } from "../lib/api/assignment";
import { getApiErrorMessage } from "../lib/api/client";
import type { Assignment, Course, CreateAssignmentDto, UpdateAssignmentDto } from "../lib/types";
import { AssignmentStatus } from "../lib/types";

interface AssignmentFormSheetProps {
  visible: boolean;
  assignment?: Assignment | null;
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
  dueDate: string;
  totalMarks: string;
  status: AssignmentStatus;
}

const STATUSES: { value: AssignmentStatus; label: string }[] = [
  { value: AssignmentStatus.DRAFT, label: "Draft" },
  { value: AssignmentStatus.PUBLISHED, label: "Published" },
];

function AssignmentFormContent({
  assignment,
  courses,
  defaultCourseId,
  onClose,
  onSaved,
}: Omit<AssignmentFormSheetProps, "visible">) {
  const isEditing = Boolean(assignment);

  const [form, setForm] = useState<FormState>(() => ({
    courseId: assignment?.courseId ?? defaultCourseId ?? courses[0]?.id ?? "",
    title: assignment?.title ?? "",
    description: assignment?.description ?? "",
    instructions: assignment?.instructions ?? "",
    dueDate: assignment?.dueDate
      ? assignment.dueDate.slice(0, 10)
      : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    totalMarks: assignment?.totalMarks ? String(assignment.totalMarks) : "100",
    status: assignment?.status ?? AssignmentStatus.PUBLISHED,
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): string | null => {
    if (!form.courseId) return "Please select a course.";
    if (!form.title.trim()) return "Assignment title is required.";
    const marks = Number(form.totalMarks);
    if (!form.totalMarks.trim() || Number.isNaN(marks) || marks <= 0) {
      return "Total marks must be a positive number.";
    }
    if (!form.dueDate.trim()) return "Due date is required.";
    const parsedDate = new Date(form.dueDate.trim());
    if (Number.isNaN(parsedDate.getTime())) {
      return "Due date must be in YYYY-MM-DD format.";
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

    const marks = Number(form.totalMarks.trim());
    const isoDueDate = form.dueDate.includes("T")
      ? form.dueDate
      : new Date(`${form.dueDate}T23:59:59.000Z`).toISOString();

    try {
      if (isEditing && assignment) {
        const updateDto: UpdateAssignmentDto = {
          courseId: form.courseId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          instructions: form.instructions.trim() || undefined,
          dueDate: isoDueDate,
          totalMarks: marks,
          status: form.status,
        };
        await assignmentService.update(assignment.id, updateDto);
      } else {
        const createDto: CreateAssignmentDto = {
          courseId: form.courseId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          instructions: form.instructions.trim() || undefined,
          dueDate: isoDueDate,
          totalMarks: marks,
          status: form.status,
          isActive: true,
        };
        await assignmentService.create(createDto);
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
        {isEditing ? "Edit Assignment" : "New Assignment"}
      </Text>
      <Text className="mb-4 text-xs text-slate-500">
        {isEditing ? "Update details and status" : "Create an assignment for your students"}
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
        label="Assignment Title"
        placeholder="e.g. Midterm Project: Binary Search Tree"
        value={form.title}
        onChangeText={(val) => setField("title", val)}
        editable={!saving}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormInput
            label="Due Date (YYYY-MM-DD)"
            placeholder="2026-09-01"
            value={form.dueDate}
            onChangeText={(val) => setField("dueDate", val)}
            editable={!saving}
          />
        </View>
        <View className="w-28">
          <FormInput
            label="Total Marks"
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
      <View className="mb-4 flex-row gap-2">
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
        placeholder="Brief overview of the assignment topic"
        value={form.description}
        onChangeText={(val) => setField("description", val)}
        multiline
        numberOfLines={2}
        editable={!saving}
      />

      <FormInput
        label="Instructions / Guidelines (Optional)"
        placeholder="Submission format, constraints, and rubric notes"
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
            title={isEditing ? "Save Changes" : "Create"}
            onPress={handleSubmit}
            loading={saving}
          />
        </View>
      </View>
    </View>
  );
}

export default function AssignmentFormSheet({
  visible,
  assignment,
  courses,
  defaultCourseId,
  onClose,
  onSaved,
}: AssignmentFormSheetProps) {
  return (
    <ProfileEditSheet visible={visible} onClose={onClose}>
      {visible ? (
        <AssignmentFormContent
          key={assignment?.id ?? "new"}
          assignment={assignment}
          courses={courses}
          defaultCourseId={defaultCourseId}
          onClose={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </ProfileEditSheet>
  );
}
