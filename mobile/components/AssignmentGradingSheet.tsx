import { useCallback, useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";

import { assignmentService } from "../lib/api/assignment";
import type { Assignment, AssignmentSubmission } from "../lib/types";
import Button from "./Button";
import FormInput from "./FormInput";
import ProfileEditSheet from "./ProfileEditSheet";

interface Props { assignment: Assignment | null; visible: boolean; onClose: () => void; }

export default function AssignmentGradingSheet({ assignment, visible, onClose }: Props) {
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [scoreById, setScoreById] = useState<Record<string, string>>({});
  const [feedbackById, setFeedbackById] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!assignment) return;
    try {
      const response = await assignmentService.submissions(assignment.id);
      setSubmissions(response.data);
      setScoreById(Object.fromEntries(response.data.map((s) => [s.id, s.score?.toString() ?? ""])));
      setFeedbackById(Object.fromEntries(response.data.map((s) => [s.id, s.feedback ?? ""])));
    } catch { Alert.alert("Could not load submissions", "Please try again."); }
  }, [assignment]);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [visible, load]);
  const grade = async (submission: AssignmentSubmission) => {
    const score = Number(scoreById[submission.id]);
    if (!Number.isInteger(score) || score < 0 || score > (assignment?.totalMarks ?? 0)) {
      Alert.alert("Invalid score", `Enter a whole number from 0 to ${assignment?.totalMarks ?? 0}.`); return;
    }
    try {
      setSavingId(submission.id);
      await assignmentService.gradeSubmission(submission.id, { score, feedback: feedbackById[submission.id]?.trim() || undefined });
      await load();
    } catch (error) { Alert.alert("Grading failed", error instanceof Error ? error.message : "Please try again."); }
    finally { setSavingId(null); }
  };
  return <ProfileEditSheet visible={visible} onClose={onClose}>
    <Text className="text-xl font-bold text-slate-900">Grade submissions</Text>
    <Text className="mt-1 text-sm text-slate-500">{assignment?.title} · {assignment?.totalMarks} marks</Text>
    {submissions.length === 0 ? <Text className="mt-6 text-sm text-slate-500">No student submissions yet.</Text> : submissions.map((submission) => <View key={submission.id} className="mt-5 border-t border-slate-200 pt-4">
      <Text className="font-semibold text-slate-900">{submission.student ? `${submission.student.firstName} ${submission.student.lastName}` : "Student"}</Text>
      <Text className="mt-1 text-sm text-slate-600">{submission.response}</Text>
      <FormInput label="Score" value={scoreById[submission.id] ?? ""} onChangeText={(value) => setScoreById((old) => ({ ...old, [submission.id]: value }))} keyboardType="number-pad" />
      <FormInput label="Feedback" value={feedbackById[submission.id] ?? ""} onChangeText={(value) => setFeedbackById((old) => ({ ...old, [submission.id]: value }))} multiline />
      <Button title="Save grade" loading={savingId === submission.id} onPress={() => grade(submission)} />
    </View>)}
  </ProfileEditSheet>;
}
