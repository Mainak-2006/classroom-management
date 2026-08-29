import { client } from "./client";
import type {
  Assignment,
  AssignmentSubmission,
  AssignmentStatus,
  CreateAssignmentDto,
  MessageResponse,
  PaginatedResponse,
  UpdateAssignmentDto,
  CreateAssignmentSubmissionDto,
  GradeAssignmentSubmissionDto,
} from "../types";

export const assignmentService = {
  create: (data: CreateAssignmentDto) =>
    client.post<MessageResponse<Assignment>>("/assignment", data).then((res) => res.data),

  list: () =>
    client.get<PaginatedResponse<Assignment>>("/assignment").then((res) => res.data),

  get: (id: string) =>
    client.get<Assignment>(`/assignment/${id}`).then((res) => res.data),

  update: (id: string, data: UpdateAssignmentDto) =>
    client.patch<MessageResponse<Assignment>>(`/assignment/${id}`, data).then((res) => res.data),

  remove: (id: string) =>
    client.delete<MessageResponse<Assignment>>(`/assignment/${id}`).then((res) => res.data),

  byCourse: (courseId: string) =>
    client
      .get<PaginatedResponse<Assignment> | Assignment[]>(`/assignment/course/${courseId}`)
      .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),

  byStatus: (status: AssignmentStatus) =>
    client
      .get<PaginatedResponse<Assignment> | Assignment[]>(`/assignment/status/${status}`)
      .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),

  submit: (assignmentId: string, data: CreateAssignmentSubmissionDto) =>
    client.post<MessageResponse<AssignmentSubmission>>(`/assignment/${assignmentId}/submissions`, data).then((res) => res.data),

  mySubmission: (assignmentId: string) =>
    client.get<AssignmentSubmission>(`/assignment/${assignmentId}/submissions/me`).then((res) => res.data),

  submissions: (assignmentId: string) =>
    client.get<PaginatedResponse<AssignmentSubmission>>(`/assignment/${assignmentId}/submissions`).then((res) => res.data),

  gradeSubmission: (submissionId: string, data: GradeAssignmentSubmissionDto) =>
    client.patch<MessageResponse<AssignmentSubmission>>(`/assignment/submissions/${submissionId}`, data).then((res) => res.data),
};
