import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";

import { assignmentService } from "../lib/api/assignment";
import type { Assignment, AssignmentSubmission } from "../lib/types";
import Button from "./Button";
import FormInput from "./FormInput";
import ProfileEditSheet from "./ProfileEditSheet";

interface Props {
  assignment: Assignment | null;
  visible: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export default function AssignmentSubmissionSheet({ assignment, visible, onClose, onSaved }: Props) {
  const [response, setResponse] = useState("");
  const [existing, setExisting] = useState<AssignmentSubmission | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !assignment) return;
    void assignmentService.mySubmission(assignment.id)
      .then((submission) => {
        setExisting(submission);
        setResponse(submission.response);
      })
      .catch(() => { setExisting(null); setResponse(""); });
  }, [assignment, visible]);

  const submit = async () => {
    if (!assignment || !response.trim()) return;
    try {
      setSaving(true);
      await assignmentService.submit(assignment.id, { response: response.trim() });
      await onSaved();
      onClose();
    } catch (error) {
      Alert.alert("Submission failed", error instanceof Error ? error.message : "Please try again.");
    } finally { setSaving(false); }
  };

  return <ProfileEditSheet visible={visible} onClose={onClose}>
    <Text className="text-xl font-bold text-slate-900">{existing ? "Update submission" : "Submit assignment"}</Text>
    <Text className="mt-1 text-sm text-slate-500">{assignment?.title}</Text>
    <View className="mt-5"><FormInput label="Your response" value={response} onChangeText={setResponse} multiline /></View>
    {existing?.score !== undefined && existing?.score !== null ? <Text className="mt-3 text-sm font-semibold text-emerald-700">Score: {existing.score} / {assignment?.totalMarks}</Text> : null}
    {existing?.feedback ? <Text className="mt-2 text-sm text-slate-600">Teacher feedback: {existing.feedback}</Text> : null}
    <View className="mt-6"><Button title={existing ? "Update submission" : "Submit work"} loading={saving} onPress={submit} /></View>
  </ProfileEditSheet>;
}
