import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";

import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import FormInput from "../../components/FormInput";
import GenderPicker from "../../components/GenderPicker";
import ProfileEditSheet from "../../components/ProfileEditSheet";
import ProfileRow from "../../components/ProfileRow";
import ProfileSection from "../../components/ProfileSection";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { getApiErrorMessage } from "../../lib/api/client";
import { studentService } from "../../lib/api/student";
import type { Student, UpdateStudentDto } from "../../lib/types";
import { Gender } from "../../lib/types";
import { useAuthStore } from "../../stores/authStore";

interface StudentForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender | "";
  address: string;
  semester: string;
  section: string;
  guardianName: string;
  guardianPhone: string;
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function StudentProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [profile, setProfile] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<StudentForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await studentService.getProfile();
      setProfile(data);
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
      dateOfBirth: profile.dateOfBirth.slice(0, 10),
      gender: profile.gender,
      address: profile.address ?? "",
      semester: String(profile.semester),
      section: profile.section ?? "",
      guardianName: profile.guardianName ?? "",
      guardianPhone: profile.guardianPhone ?? "",
    });
    setFormError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    if (saving) return;
    setForm(null);
    setFormError(null);
    setEditing(false);
  };

  const setField = <K extends keyof StudentForm>(key: K, value: StudentForm[K]) =>
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
    const semester = Number(form.semester);
    if (!form.semester.trim() || !Number.isInteger(semester) || semester < 1 || semester > 8)
      return "Semester must be a number between 1 and 8.";
    return null;
  };

  const handleSave = async () => {
    if (saving || !form) return;
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const dto: UpdateStudentDto = {
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || undefined,
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dateOfBirth: form.dateOfBirth.trim(),
      gender: form.gender as Gender,
      address: form.address.trim() || undefined,
      semester: Number(form.semester),
      section: form.section.trim() || undefined,
      guardianName: form.guardianName.trim() || undefined,
      guardianPhone: form.guardianPhone.trim() || undefined,
    };

    setSaving(true);
    setFormError(null);
    try {
      const response = await studentService.update(user!.id, dto);
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
        showsVerticalScrollIndicator={false}
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
          <View>
            <View className="mt-6 items-center rounded-xl border border-slate-200 bg-white p-6">
              <Avatar name={fullName} />
              <Text className="mt-3 text-lg font-semibold text-slate-900">{fullName}</Text>
              <View className="mt-1 flex-row items-center gap-2">
                <Text className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                  STUDENT
                </Text>
                <Text className="text-sm capitalize text-slate-500">
                  Semester {profile.semester} · {profile.department}
                </Text>
              </View>
            </View>

            <ProfileSection title="Personal">
              <ProfileRow label="Email" value={profile.email} />
              <ProfileRow label="Phone" value={profile.phone} />
              <ProfileRow label="Date of birth" value={profile.dateOfBirth.slice(0, 10)} />
              <ProfileRow
                label="Gender"
                value={profile.gender.charAt(0) + profile.gender.slice(1).toLowerCase()}
              />
              <ProfileRow label="Address" value={profile.address} />
            </ProfileSection>

            <ProfileSection title="Academic">
              <ProfileRow label="Roll number" value={profile.rollNumber} />
              <ProfileRow label="Registration number" value={profile.registrationNumber} />
              <ProfileRow label="Department" value={profile.department} />
              <ProfileRow label="Semester" value={profile.semester} />
              <ProfileRow label="Section" value={profile.section} />
            </ProfileSection>

            <ProfileSection title="Guardian">
              <ProfileRow label="Name" value={profile.guardianName} />
              <ProfileRow label="Phone" value={profile.guardianPhone} />
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
        ) : null}
      </ScrollView>

      {profile ? (
        <ProfileEditSheet visible={editing} onClose={cancelEditing}>
          {form ? (
            <View>
              <View className="mt-6 items-center rounded-xl border border-slate-200 bg-white p-6">
                <Avatar name={fullName} />
                <Text className="mt-3 text-lg font-semibold text-slate-900">{fullName}</Text>
                <View className="mt-1 flex-row items-center gap-2">
                  <Text className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                    STUDENT
                  </Text>
                  <Text className="text-sm capitalize text-slate-500">Student</Text>
                </View>
              </View>

              <View className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-1">
                <ProfileRow label="Roll number" value={profile.rollNumber} />
                <ProfileRow label="Registration number" value={profile.registrationNumber} />
                <ProfileRow label="Department" value={profile.department} />
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
                  label="Address (optional)"
                  value={form.address}
                  onChangeText={(address) => setField("address", address)}
                  autoCapitalize="words"
                  editable={!saving}
                />
                <FormInput
                  label="Semester (1-8)"
                  value={form.semester}
                  onChangeText={(semester) =>
                    setField("semester", semester.replace(/[^0-9]/g, ""))
                  }
                  keyboardType="number-pad"
                  editable={!saving}
                />
                <FormInput
                  label="Section (optional)"
                  value={form.section}
                  onChangeText={(section) => setField("section", section)}
                  autoCapitalize="characters"
                  editable={!saving}
                />
                <FormInput
                  label="Guardian name (optional)"
                  value={form.guardianName}
                  onChangeText={(guardianName) => setField("guardianName", guardianName)}
                  autoCapitalize="words"
                  editable={!saving}
                />
                <FormInput
                  label="Guardian phone (optional)"
                  value={form.guardianPhone}
                  onChangeText={(guardianPhone) => setField("guardianPhone", guardianPhone)}
                  keyboardType="phone-pad"
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
          ) : null}
        </ProfileEditSheet>
      ) : null}
    </Screen>
  );
}