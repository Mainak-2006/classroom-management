import { useState } from "react";
import { Text } from "react-native";

import Button from "./Button";
import FormInput from "./FormInput";
import ProfileEditSheet from "./ProfileEditSheet";
import { getApiErrorMessage } from "../lib/api/client";
import { courseService } from "../lib/api/course";
import type { CreateCourseDto } from "../lib/types";

interface CourseFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface CourseForm {
  name: string;
  code: string;
  department: string;
  semester: string;
  credits: string;
  description: string;
}

const EMPTY_FORM: CourseForm = {
  name: "",
  code: "",
  department: "",
  semester: "",
  credits: "",
  description: "",
};

export default function CourseFormSheet({
  visible,
  onClose,
  onCreated,
}: CourseFormSheetProps) {
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof CourseForm>(key: K, value: CourseForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const reset = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setSaving(false);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!form.name.trim()) {
      setFormError("Course name is required.");
      return;
    }
    if (!form.code.trim()) {
      setFormError("Course code is required.");
      return;
    }
    if (!form.department.trim()) {
      setFormError("Department is required.");
      return;
    }
    const semester = Number(form.semester);
    if (!form.semester.trim() || !Number.isInteger(semester) || semester < 1) {
      setFormError("Semester must be a positive whole number.");
      return;
    }
    const credits = Number(form.credits);
    if (!form.credits.trim() || !Number.isFinite(credits) || credits < 1) {
      setFormError("Credits must be a positive number.");
      return;
    }

    const dto: CreateCourseDto = {
      name: form.name.trim(),
      code: form.code.trim(),
      department: form.department.trim(),
      semester,
      credits,
      description: form.description.trim() || undefined,
      isActive: true,
    };

    setSaving(true);
    setFormError(null);
    try {
      await courseService.create(dto);
      reset();
      onCreated();
    } catch (saveError) {
      setFormError(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileEditSheet visible={visible} onClose={handleClose}>
      <Text className="mb-4 text-lg font-bold text-slate-900">New Course</Text>

      <FormInput
        label="Name"
        placeholder="e.g. Data Structures"
        value={form.name}
        onChangeText={(value) => setField("name", value)}
        editable={!saving}
        autoCapitalize="words"
      />
      <FormInput
        label="Code"
        placeholder="e.g. CS201"
        value={form.code}
        onChangeText={(value) => setField("code", value)}
        editable={!saving}
        autoCapitalize="characters"
      />
      <FormInput
        label="Department"
        placeholder="e.g. Computer Science"
        value={form.department}
        onChangeText={(value) => setField("department", value)}
        editable={!saving}
        autoCapitalize="words"
      />
      <FormInput
        label="Semester"
        placeholder="e.g. 3"
        value={form.semester}
        onChangeText={(value) => setField("semester", value)}
        editable={!saving}
        keyboardType="number-pad"
      />
      <FormInput
        label="Credits"
        placeholder="e.g. 4"
        value={form.credits}
        onChangeText={(value) => setField("credits", value)}
        editable={!saving}
        keyboardType="decimal-pad"
      />
      <FormInput
        label="Description"
        placeholder="Optional"
        value={form.description}
        onChangeText={(value) => setField("description", value)}
        editable={!saving}
        multiline
        numberOfLines={3}
      />

      {formError ? <Text className="mb-3 text-sm text-red-600">{formError}</Text> : null}

      <Button title="Create Course" onPress={handleSubmit} loading={saving} />
    </ProfileEditSheet>
  );
}