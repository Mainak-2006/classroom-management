import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import Button from "../../components/Button";
import FormInput from "../../components/FormInput";
import Screen from "../../components/Screen";
import { colors } from "../../constants/theme";
import { getApiErrorMessage } from "../../lib/api/client";
import { Gender, UserRole } from "../../lib/types";
import type { RegisterDto } from "../../lib/types";
import { useAuthStore } from "../../stores/authStore";

type Role = Exclude<UserRole, UserRole.ADMIN>;

interface PersonalForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender | "";
  password: string;
  confirmPassword: string;
}

interface StudentForm {
  rollNumber: string;
  registrationNumber: string;
  department: string;
  semester: string;
  section: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
}

interface TeacherForm {
  employeeId: string;
  department: string;
  designation: string;
  qualification: string;
  specialization: string;
  officeRoom: string;
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);

  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);

  const [personal, setPersonal] = useState<PersonalForm>({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    password: "",
    confirmPassword: "",
  });
  const [student, setStudent] = useState<StudentForm>({
    rollNumber: "",
    registrationNumber: "",
    department: "",
    semester: "",
    section: "",
    address: "",
    guardianName: "",
    guardianPhone: "",
  });
  const [teacher, setTeacher] = useState<TeacherForm>({
    employeeId: "",
    department: "",
    designation: "",
    qualification: "",
    specialization: "",
    officeRoom: "",
  });

  const [stepError, setStepError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setPersonalField = <K extends keyof PersonalForm>(key: K, value: PersonalForm[K]) =>
    setPersonal((f) => ({ ...f, [key]: value }));

  const setStudentField = <K extends keyof StudentForm>(key: K, value: StudentForm[K]) =>
    setStudent((f) => ({ ...f, [key]: value }));

  const setTeacherField = <K extends keyof TeacherForm>(key: K, value: TeacherForm[K]) =>
    setTeacher((f) => ({ ...f, [key]: value }));

  const validatePersonal = (): string | null => {
    if (!personal.firstName.trim()) return "First name is required.";
    if (!personal.lastName.trim()) return "Last name is required.";
    if (!personal.email.trim()) return "Email is required.";
    if (!EMAIL_REGEX.test(personal.email.trim())) return "Enter a valid email address.";
    if (!personal.phone.trim()) return "Phone number is required.";
    if (!personal.dateOfBirth.trim()) return "Date of birth is required.";
    if (!DATE_REGEX.test(personal.dateOfBirth.trim()))
      return "Date of birth must be in YYYY-MM-DD format.";
    if (!personal.gender) return "Gender is required.";
    if (!personal.password) return "Password is required.";
    if (personal.password.length < 8) return "Password must be at least 8 characters.";
    if (personal.confirmPassword !== personal.password) return "Passwords do not match.";
    return null;
  };

  const validateRoleSpecific = (): string | null => {
    if (role === UserRole.STUDENT) {
      if (!student.rollNumber.trim()) return "Roll number is required.";
      if (!student.registrationNumber.trim()) return "Registration number is required.";
      if (!student.department.trim()) return "Department is required.";
      const semester = Number(student.semester);
      if (!student.semester.trim() || !Number.isInteger(semester) || semester < 1 || semester > 8)
        return "Semester must be a number between 1 and 8.";
    } else if (role === UserRole.TEACHER) {
      if (!teacher.employeeId.trim()) return "Employee ID is required.";
      if (!teacher.department.trim()) return "Department is required.";
      if (!teacher.designation.trim()) return "Designation is required.";
      if (!teacher.qualification.trim()) return "Qualification is required.";
    }
    return null;
  };

  const handleNext = () => {
    setStepError(null);

    if (step === 0) {
      if (!role) {
        setStepError("Please choose a role to continue.");
        return;
      }
    } else if (step === 1) {
      const error = validatePersonal();
      if (error) {
        setStepError(error);
        return;
      }
    }

    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (loading) return;

    const error = validateRoleSpecific();
    if (error) {
      setStepError(error);
      return;
    }

    const dto: RegisterDto = {
      role: role as Role,
      student:
        role === UserRole.STUDENT
          ? {
              firstName: personal.firstName.trim(),
              middleName: personal.middleName.trim() || undefined,
              lastName: personal.lastName.trim(),
              email: personal.email.trim(),
              phone: personal.phone.trim(),
              dateOfBirth: personal.dateOfBirth.trim(),
              gender: personal.gender as Gender,
              rollNumber: student.rollNumber.trim(),
              registrationNumber: student.registrationNumber.trim(),
              department: student.department.trim(),
              semester: Number(student.semester),
              section: student.section.trim() || undefined,
              address: student.address.trim() || undefined,
              guardianName: student.guardianName.trim() || undefined,
              guardianPhone: student.guardianPhone.trim() || undefined,
              password: personal.password,
              confirmPassword: personal.confirmPassword,
            }
          : undefined,
      teacher:
        role === UserRole.TEACHER
          ? {
              firstName: personal.firstName.trim(),
              middleName: personal.middleName.trim() || undefined,
              lastName: personal.lastName.trim(),
              email: personal.email.trim(),
              phone: personal.phone.trim(),
              dateOfBirth: personal.dateOfBirth.trim(),
              gender: personal.gender as Gender,
              employeeId: teacher.employeeId.trim(),
              department: teacher.department.trim(),
              designation: teacher.designation.trim(),
              qualification: teacher.qualification.trim(),
              specialization: teacher.specialization.trim() || undefined,
              officeRoom: teacher.officeRoom.trim() || undefined,
              password: personal.password,
              confirmPassword: personal.confirmPassword,
            }
          : undefined,
    };

    setLoading(true);
    setStepError(null);
    try {
      await register(dto);
    } catch (submitError) {
      setStepError(getApiErrorMessage(submitError));
      setLoading(false);
    }
  };

  const goBack = () => {
    setStepError(null);
    setStep((s) => s - 1);
  };

  const isLastStep = step === 2;

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-row items-center gap-3 py-4">
          {step > 0 ? (
            <Pressable onPress={goBack} hitSlop={12} disabled={loading}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          ) : null}
          <View className="flex-1">
            <Text className="text-xl font-bold text-slate-900">Create account</Text>
            <Text className="mt-0.5 text-sm text-slate-500">
              {isLastStep
                ? role === UserRole.STUDENT
                  ? "Student details"
                  : "Teacher details"
                : step === 1
                  ? "Account & personal details"
                  : "Choose your role"}
            </Text>
          </View>
        </View>

        <View className="mb-4 flex-row gap-2">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: i <= step ? colors.primary : colors.border }}
            />
          ))}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 ? (
            <View>
              <RoleCard
                title="Student"
                description="Join as a student to access your courses, assignments, and exams."
                icon="school"
                selected={role === UserRole.STUDENT}
                onPress={() => {
                  setRole(UserRole.STUDENT);
                  setStepError(null);
                }}
              />
              <RoleCard
                title="Teacher"
                description="Join as a teacher to manage your classes and students."
                icon="person"
                selected={role === UserRole.TEACHER}
                onPress={() => {
                  setRole(UserRole.TEACHER);
                  setStepError(null);
                }}
              />
            </View>
          ) : null}

          {step === 1 ? (
            <View>
              <FormInput
                label="First name"
                value={personal.firstName}
                onChangeText={(firstName) => setPersonalField("firstName", firstName)}
                placeholder="John"
                autoCapitalize="words"
                editable={!loading}
              />
              <FormInput
                label="Middle name (optional)"
                value={personal.middleName}
                onChangeText={(middleName) => setPersonalField("middleName", middleName)}
                placeholder="David"
                autoCapitalize="words"
                editable={!loading}
              />
              <FormInput
                label="Last name"
                value={personal.lastName}
                onChangeText={(lastName) => setPersonalField("lastName", lastName)}
                placeholder="Doe"
                autoCapitalize="words"
                editable={!loading}
              />
              <FormInput
                label="Email"
                value={personal.email}
                onChangeText={(email) => setPersonalField("email", email)}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
              <FormInput
                label="Phone"
                value={personal.phone}
                onChangeText={(phone) => setPersonalField("phone", phone)}
                placeholder="+1 555 123 4567"
                keyboardType="phone-pad"
                editable={!loading}
              />
              <FormInput
                label="Date of birth (YYYY-MM-DD)"
                value={personal.dateOfBirth}
                onChangeText={(dateOfBirth) => setPersonalField("dateOfBirth", dateOfBirth)}
                placeholder="2004-05-15"
                autoCapitalize="none"
                editable={!loading}
              />

              <Text className="mb-1.5 text-sm font-medium text-slate-700">Gender</Text>
              <View className="mb-4 flex-row gap-2">
                {Object.values(Gender).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => {
                      setPersonalField("gender", g);
                      setStepError(null);
                    }}
                    disabled={loading}
                    className="flex-1 items-center rounded-lg border py-3"
                    style={{
                      borderColor: personal.gender === g ? colors.primary : colors.border,
                      backgroundColor: personal.gender === g ? "#EFF6FF" : colors.surface,
                    }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: personal.gender === g ? colors.primary : colors.textMuted,
                      }}
                    >
                      {g.charAt(0) + g.slice(1).toLowerCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <FormInput
                label="Password"
                value={personal.password}
                onChangeText={(password) => setPersonalField("password", password)}
                placeholder="At least 8 characters"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!loading}
              />
              <FormInput
                label="Confirm password"
                value={personal.confirmPassword}
                onChangeText={(confirmPassword) => setPersonalField("confirmPassword", confirmPassword)}
                placeholder="Re-enter your password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!loading}
              />
            </View>
          ) : null}

          {step === 2 && role === UserRole.STUDENT ? (
            <View>
              <FormInput
                label="Roll number"
                value={student.rollNumber}
                onChangeText={(rollNumber) => setStudentField("rollNumber", rollNumber)}
                placeholder="CSE-2024-001"
                autoCapitalize="characters"
                editable={!loading}
              />
              <FormInput
                label="Registration number"
                value={student.registrationNumber}
                onChangeText={(registrationNumber) =>
                  setStudentField("registrationNumber", registrationNumber)
                }
                placeholder="REG-2024-0001"
                autoCapitalize="characters"
                editable={!loading}
              />
              <FormInput
                label="Department"
                value={student.department}
                onChangeText={(department) => setStudentField("department", department)}
                placeholder="Computer Science"
                autoCapitalize="words"
                editable={!loading}
              />
              <FormInput
                label="Semester (1-8)"
                value={student.semester}
                onChangeText={(semester) => setStudentField("semester", semester.replace(/[^0-9]/g, ""))}
                placeholder="3"
                keyboardType="number-pad"
                editable={!loading}
              />
              <FormInput
                label="Section (optional)"
                value={student.section}
                onChangeText={(section) => setStudentField("section", section)}
                placeholder="A"
                autoCapitalize="characters"
                editable={!loading}
              />
              <FormInput
                label="Address (optional)"
                value={student.address}
                onChangeText={(address) => setStudentField("address", address)}
                placeholder="123 Main Street, City"
                autoCapitalize="words"
                editable={!loading}
              />
              <FormInput
                label="Guardian name (optional)"
                value={student.guardianName}
                onChangeText={(guardianName) => setStudentField("guardianName", guardianName)}
                placeholder="Jane Doe"
                autoCapitalize="words"
                editable={!loading}
              />
              <FormInput
                label="Guardian phone (optional)"
                value={student.guardianPhone}
                onChangeText={(guardianPhone) =>
                  setStudentField("guardianPhone", guardianPhone)
                }
                placeholder="+1 555 987 6543"
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>
          ) : null}

          {step === 2 && role === UserRole.TEACHER ? (
            <View>
              <FormInput
                label="Employee ID"
                value={teacher.employeeId}
                onChangeText={(employeeId) => setTeacherField("employeeId", employeeId)}
                placeholder="EMP-2024-001"
                autoCapitalize="characters"
                editable={!loading}
              />
              <FormInput
                label="Department"
                value={teacher.department}
                onChangeText={(department) => setTeacherField("department", department)}
                placeholder="Computer Science"
                autoCapitalize="words"
                editable={!loading}
              />
              <FormInput
                label="Designation"
                value={teacher.designation}
                onChangeText={(designation) => setTeacherField("designation", designation)}
                placeholder="Assistant Professor"
                autoCapitalize="words"
                editable={!loading}
              />
              <FormInput
                label="Qualification"
                value={teacher.qualification}
                onChangeText={(qualification) => setTeacherField("qualification", qualification)}
                placeholder="M.Tech, Computer Science"
                autoCapitalize="words"
                editable={!loading}
              />
              <FormInput
                label="Specialization (optional)"
                value={teacher.specialization}
                onChangeText={(specialization) =>
                  setTeacherField("specialization", specialization)
                }
                placeholder="Machine Learning"
                autoCapitalize="words"
                editable={!loading}
              />
              <FormInput
                label="Office room (optional)"
                value={teacher.officeRoom}
                onChangeText={(officeRoom) => setTeacherField("officeRoom", officeRoom)}
                placeholder="A-204"
                editable={!loading}
              />
            </View>
          ) : null}

          {stepError ? (
            <Text className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{stepError}</Text>
          ) : null}

          <Button
            title={isLastStep ? "Create Account" : "Continue"}
            onPress={isLastStep ? handleSubmit : handleNext}
            loading={loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

interface RoleCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}

function RoleCard({ title, description, icon, selected, onPress }: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center gap-4 rounded-xl border p-4"
      style={{
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? "#EFF6FF" : colors.surface,
      }}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: selected ? colors.primary : "#EEF2F7" }}
      >
        <Ionicons name={icon} size={24} color={selected ? "#FFFFFF" : colors.textMuted} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-slate-900">{title}</Text>
        <Text className="mt-0.5 text-sm text-slate-500">{description}</Text>
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={selected ? colors.primary : colors.border}
      />
    </Pressable>
  );
}
