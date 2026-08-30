import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import Avatar from "./Avatar";
import Button from "./Button";
import ProfileEditSheet from "./ProfileEditSheet";
import { colors } from "../constants/theme";
import { getApiErrorMessage } from "../lib/api/client";
import { examService } from "../lib/api/exam";
import type { Course, Exam, ExamSubmission, Student } from "../lib/types";

interface ExamGradingSheetProps {
  visible: boolean;
  exam: Exam | null;
  course: Course | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ExamGradingSheet({
  visible,
  exam,
  course,
  onClose,
  onSaved,
}: ExamGradingSheetProps) {
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scores map: studentId -> string score value
  const [scores, setScores] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const students = useMemo<Student[]>(() => course?.students ?? [], [course]);

  const loadSubmissions = useCallback(async () => {
    if (!exam) return;
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const data = await examService.getSubmissions(exam.id);
      setSubmissions(data);

      const initialScores: Record<string, string> = {};
      for (const sub of data) {
        initialScores[sub.studentId] = String(sub.score);
      }
      setScores(initialScores);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, [exam]);

  useEffect(() => {
    if (visible && exam) {
      const run = async () => {
        await loadSubmissions();
      };
      void run();
    }
  }, [visible, exam, loadSubmissions]);

  const submissionsByStudent = useMemo(() => {
    const map = new Map<string, ExamSubmission>();
    for (const sub of submissions) {
      map.set(sub.studentId, sub);
    }
    return map;
  }, [submissions]);

  const stats = useMemo(() => {
    const graded = Object.values(scores).filter((s) => s.trim() !== "" && !Number.isNaN(Number(s)));
    const totalScore = graded.reduce((sum, s) => sum + Number(s), 0);
    const average = graded.length > 0 ? (totalScore / graded.length).toFixed(1) : "—";
    return {
      totalStudents: students.length,
      gradedCount: graded.length,
      average,
    };
  }, [scores, students]);

  const handleScoreChange = (studentId: string, val: string) => {
    setFeedback(null);
    setScores((prev) => ({ ...prev, [studentId]: val }));
  };

  const saveStudentScore = async (studentId: string) => {
    if (!exam) return;
    const rawVal = scores[studentId]?.trim();
    if (!rawVal) {
      setFeedback({ kind: "error", text: "Please enter a valid numeric score." });
      return;
    }
    const numericScore = Number(rawVal);
    if (!Number.isInteger(numericScore)) {
      setFeedback({ kind: "error", text: "Score must be a whole number." });
      return;
    }
    if (numericScore < 0 || numericScore > exam.totalMarks) {
      setFeedback({
        kind: "error",
        text: `Score must be between 0 and ${exam.totalMarks}.`,
      });
      return;
    }

    setSavingId(studentId);
    setFeedback(null);
    try {
      const existing = submissionsByStudent.get(studentId);
      if (existing) {
        await examService.updateSubmission(existing.id, { score: numericScore });
      } else {
        await examService.submit(exam.id, { studentId, score: numericScore });
      }
      await loadSubmissions();
      setFeedback({ kind: "success", text: "Score saved successfully." });
      onSaved();
    } catch (saveError) {
      setFeedback({ kind: "error", text: getApiErrorMessage(saveError) });
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    if (!exam || savingAll) return;
    setSavingAll(true);
    setFeedback(null);

    try {
      let savedCount = 0;
      for (const student of students) {
        const rawVal = scores[student.id]?.trim();
        if (!rawVal) continue;
        const numericScore = Number(rawVal);
        if (!Number.isInteger(numericScore)) continue;
        if (numericScore < 0 || numericScore > exam.totalMarks) {
          continue;
        }

        const existing = submissionsByStudent.get(student.id);
        if (existing) {
          if (existing.score !== numericScore) {
            await examService.updateSubmission(existing.id, { score: numericScore });
            savedCount += 1;
          }
        } else {
          await examService.submit(exam.id, { studentId: student.id, score: numericScore });
          savedCount += 1;
        }
      }

      await loadSubmissions();
      setFeedback({
        kind: "success",
        text: savedCount > 0 ? `Saved grades for ${savedCount} student(s).` : "No pending grade changes.",
      });
      onSaved();
    } catch (saveError) {
      setFeedback({ kind: "error", text: getApiErrorMessage(saveError) });
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <ProfileEditSheet visible={visible} onClose={onClose}>
      <Text className="mb-1 text-lg font-bold text-slate-900">Grade Exam</Text>
      <Text className="mb-4 text-xs text-slate-500">
        {exam?.title} · Max Marks: {exam?.totalMarks}
      </Text>

      {/* Summary statistics */}
      <View className="mb-4 flex-row gap-2">
        <View className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <Text className="text-lg font-bold text-slate-900">{stats.totalStudents}</Text>
          <Text className="text-xs text-slate-500">Enrolled</Text>
        </View>
        <View className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <Text className="text-lg font-bold text-emerald-600">
            {stats.gradedCount} / {stats.totalStudents}
          </Text>
          <Text className="text-xs text-slate-500">Graded</Text>
        </View>
        <View className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <Text className="text-lg font-bold text-sky-600">{stats.average}</Text>
          <Text className="text-xs text-slate-500">Class Avg</Text>
        </View>
      </View>

      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View className="items-center py-8">
          <Text className="text-sm text-slate-500">{error}</Text>
          <View className="mt-4 w-40">
            <Button title="Retry" onPress={loadSubmissions} />
          </View>
        </View>
      ) : students.length === 0 ? (
        <View className="items-center py-8">
          <Text className="text-sm text-slate-500">
            No students enrolled in this course yet.
          </Text>
        </View>
      ) : (
        <View className="pb-4">
          <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Student Grades ({students.length})
          </Text>
          <View className="gap-2.5">
            {students.map((student) => {
              const fullName = [student.firstName, student.middleName, student.lastName]
                .filter(Boolean)
                .join(" ");
              const existingSub = submissionsByStudent.get(student.id);
              const scoreVal = scores[student.id] ?? "";
              const isSaving = savingId === student.id;

              return (
                <View
                  key={student.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center gap-2.5 pr-2">
                      <Avatar name={fullName} size={36} />
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-slate-900" numberOfLines={1}>
                          {fullName}
                        </Text>
                        <Text className="text-xs text-slate-400">
                          Roll: {student.rollNumber}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <View className="flex-row items-center rounded-lg border border-slate-300 bg-slate-50 px-2 py-1">
                        <TextInput
                          value={scoreVal}
                          onChangeText={(val) => handleScoreChange(student.id, val)}
                          keyboardType="number-pad"
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                          className="w-12 text-center text-sm font-bold text-slate-900"
                        />
                        <Text className="text-xs text-slate-400">/ {exam?.totalMarks}</Text>
                      </View>

                      <Pressable
                        onPress={() => saveStudentScore(student.id)}
                        disabled={isSaving || savingAll}
                        className="items-center justify-center rounded-lg px-2.5 py-1.5"
                        style={{ backgroundColor: colors.primary }}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text className="text-xs font-semibold text-white">
                            {existingSub ? "Update" : "Save"}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {feedback ? (
            <Text
              className={`mt-4 rounded-lg p-3 text-xs ${
                feedback.kind === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {feedback.text}
            </Text>
          ) : null}

          <View className="mt-5 mb-8 flex-row gap-3">
            <View className="flex-1">
              <Button title="Close" onPress={onClose} variant="secondary" />
            </View>
            <View className="flex-1">
              <Button
                title="Save All Grades"
                onPress={handleSaveAll}
                loading={savingAll}
              />
            </View>
          </View>
        </View>
      )}
    </ProfileEditSheet>
  );
}
