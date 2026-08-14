import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import FormInput from "../../components/FormInput";
import GenderPicker from "../../components/GenderPicker";
import ProfileRow from "../../components/ProfileRow";
import ProfileSection from "../../components/ProfileSection";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { getApiErrorMessage } from "../../lib/api/client";
import { teacherService } from "../../lib/api/teacher";
import type { Teacher, UpdateTeacherDto } from "../../lib/types";
import { Gender } from "../../lib/types";
import { useAuthStore } from "../../stores/authStore";

interface TeacherForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender | "";
  department: string;
  designation: string;
  qualification: string;
  specialization: string;
  officeRoom: string;
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function TeacherProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<Teacher | null>(null);
  const [courseCount, setCourseCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TeacherForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const [data, courses] = await Promise.all([
        teacherService.getProfile(),
        teacherService.getCourses(),
      ]);
      setProfile(data);
      setCourseCount(courses.length);
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

  const startEditing = () => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName,
      middleName: profile.middleName ?? "",
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      department: profile.department,
      designation: profile.designation,
      qualification: profile.qualification,
      specialization: profile.specialization ?? "",
      officeRoom: profile.officeRoom ?? "",
    });
    setFormError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setForm(null);
    setFormError(null);
    setEditing(false);
  };

  const setField = <K extends keyof TeacherForm>(key: K, value: TeacherForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const validate = (): string | null => {
    if (!form) return "Form is not ready.";
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim()) return "Last name is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!EMAIL_REGEX.test(form.email.trim())) return "Enter a valid email address.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!form.dateOfBirth.trim()) return "Date of birth is required.";
    if (!DATE_REGEX.test(form.dateOfBirth.trim()))
      return "Date of birth must be in YYYY-MM-DD format.";
    if (!form.gender) return "Gender is required.";
    if (!form.department.trim()) return "Department is required.";
    if (!form.designation.trim()) return "Designation is required.";
    if (!form.qualification.trim()) return "Qualification is required.";
    return null;
  };

  const handleSave = async () => {
    if (saving || !form) return;
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const dto: UpdateTeacherDto = {
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || undefined,
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dateOfBirth: form.dateOfBirth.trim(),
      gender: form.gender as Gender,
      department: form.department.trim(),
      designation: form.designation.trim(),
      qualification: form.qualification.trim(),
      specialization: form.specialization.trim() || undefined,
      officeRoom: form.officeRoom.trim() || undefined,
    };

    setSaving(true);
    setFormError(null);
    try {
      const response = await teacherService.update(user!.id, dto);
      setProfile(response.data);
      setEditing(false);
      setForm(null);
    } catch (saveError) {
      setFormError(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const fullName = profile
    ? [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ")
    : "";

  return (
    <Screen>
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text className="text-2xl font-bold text-slate-900">Profile</Text>

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
        ) : profile ? (
          editing && form ? (
            <View>
              <View className="mt-6 items-center rounded-xl border border-slate-200 bg-white p-6">
                <Avatar name={fullName} />
                <Text className="mt-3 text-lg font-semibold text-slate-900">{fullName}</Text>
                <View className="mt-1 flex-row items-center gap-2">
                  <Text className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                    TEACHER
                  </Text>
                  <Text className="text-sm capitalize text-slate-500">
                    {profile.designation} · {profile.department}
                  </Text>
                </View>
              </View>

              <View className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-1">
                <ProfileRow label="Employee ID" value={profile.employeeId} />
              </View>

              <View className="mt-6">
                <FormInput
                  label="First name"
                  value={form.firstName}
                  onChangeText={(firstName) => setField("firstName", firstName)}
                  autoCapitalize="words"
                  editable={!saving}
                />
                <FormInput
                  label="Middle name (optional)"
                  value={form.middleName}
                  onChangeText={(middleName) => setField("middleName", middleName)}
                  autoCapitalize="words"
                  editable={!saving}
                />
                <FormInput
                  label="Last name"
                  value={form.lastName}
                  onChangeText={(lastName) => setField("lastName", lastName)}
                  autoCapitalize="words"
                  editable={!saving}
                />
                <FormInput
                  label="Email"
                  value={form.email}
                  onChangeText={(email) => setField("email", email)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!saving}
                />
                <FormInput
                  label="Phone"
                  value={form.phone}
                  onChangeText={(phone) => setField("phone", phone)}
                  keyboardType="phone-pad"
                  editable={!saving}
                />
                <FormInput
                  label="Date of birth (YYYY-MM-DD)"
                  value={form.dateOfBirth}
                  onChangeText={(dateOfBirth) => setField("dateOfBirth", dateOfBirth)}
                  autoCapitalize="none"
                  editable={!saving}
                />
                <GenderPicker
                  value={form.gender}
                  onChange={(gender) => setField("gender", gender)}
                  disabled={saving}
                />
                <FormInput
                  label="Department"
                  value={form.department}
                  onChangeText={(department) => setField("department", department)}
                  autoCapitalize="words"
                  editable={!saving}
                />
                <FormInput
                  label="Designation"
                  value={form.designation}
                  onChangeText={(designation) => setField("designation", designation)}
                  autoCapitalize="words"
                  editable={!saving}
                />
                <FormInput
                  label="Qualification"
                  value={form.qualification}
                  onChangeText={(qualification) => setField("qualification", qualification)}
                  autoCapitalize="words"
                  editable={!saving}
                />
                <FormInput
                  label="Specialization (optional)"
                  value={form.specialization}
                  onChangeText={(specialization) => setField("specialization", specialization)}
                  autoCapitalize="words"
                  editable={!saving}
                />
                <FormInput
                  label="Office room (optional)"
                  value={form.officeRoom}
                  onChangeText={(officeRoom) => setField("officeRoom", officeRoom)}
                  editable={!saving}
                />
              </View>

              {formError ? (
                <Text className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {formError}
                </Text>
              ) : null}

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    title="Cancel"
                    onPress={cancelEditing}
                    disabled={saving}
                    variant="secondary"
                  />
                </View>
                <View className="flex-1">
                  <Button title="Save" onPress={handleSave} loading={saving} />
                </View>
              </View>
            </View>
          ) : (
            <View>
              <View className="mt-6 items-center rounded-xl border border-slate-200 bg-white p-6">
                <Avatar name={fullName} />
                <Text className="mt-3 text-lg font-semibold text-slate-900">{fullName}</Text>
                <View className="mt-1 flex-row items-center gap-2">
                  <Text className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                    TEACHER
                  </Text>
                  <Text className="text-sm capitalize text-slate-500">
                    {profile.designation} · {profile.department}
                  </Text>
                </View>
              </View>

              <ProfileSection title="Personal">
                <ProfileRow label="Email" value={profile.email} />
                <ProfileRow label="Phone" value={profile.phone} />
                <ProfileRow label="Date of birth" value={profile.dateOfBirth} />
                <ProfileRow
                  label="Gender"
                  value={profile.gender.charAt(0) + profile.gender.slice(1).toLowerCase()}
                />
              </ProfileSection>

              <ProfileSection title="Employment">
                <ProfileRow label="Employee ID" value={profile.employeeId} />
                <ProfileRow label="Department" value={profile.department} />
                <ProfileRow label="Designation" value={profile.designation} />
                <ProfileRow label="Qualification" value={profile.qualification} />
                <ProfileRow label="Specialization" value={profile.specialization} />
                <ProfileRow label="Office room" value={profile.officeRoom} />
                <ProfileRow label="Courses teaching" value={courseCount} />
              </ProfileSection>

              <View className="mt-6">
                <Button title="Edit Profile" onPress={startEditing} />
              </View>
              <View className="mt-3 mb-28">
                <Button
                  title="Log Out"
                  onPress={handleLogout}
                  loading={loggingOut}
                  variant="secondary"
                />
              </View>
            </View>
          )
        ) : null}
      </ScrollView>
    </Screen>
  );
}