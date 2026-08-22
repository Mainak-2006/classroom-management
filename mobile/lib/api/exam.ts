import { client } from "./client";
import type {
  CreateExamDto,
  CreateExamSubmissionDto,
  Exam,
  ExamStatus,
  ExamSubmission,
  MessageResponse,
  PaginatedResponse,
  UpdateExamDto,
  UpdateExamSubmissionDto,
} from "../types";

export const examService = {
  create: (data: CreateExamDto) =>
    client.post<MessageResponse<Exam>>("/exam", data).then((res) => res.data),

  list: () =>
    client.get<PaginatedResponse<Exam>>("/exam").then((res) => res.data),

  get: (id: string) =>
    client.get<Exam>(`/exam/${id}`).then((res) => res.data),

  update: (id: string, data: UpdateExamDto) =>
    client.patch<MessageResponse<Exam>>(`/exam/${id}`, data).then((res) => res.data),

  remove: (id: string) =>
    client.delete<MessageResponse<Exam>>(`/exam/${id}`).then((res) => res.data),

  byCourse: (courseId: string) =>
    client
      .get<PaginatedResponse<Exam> | Exam[]>(`/exam/course/${courseId}`)
      .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),

  byStatus: (status: ExamStatus) =>
    client
      .get<PaginatedResponse<Exam> | Exam[]>(`/exam/status/${status}`)
      .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),

  submissionsByStudent: (studentId: string) =>
    client
      .get<PaginatedResponse<ExamSubmission> | ExamSubmission[]>(
        `/exam/submissions/student/${studentId}`,
      )
      .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),

  submit: (examId: string, data: CreateExamSubmissionDto) =>
    client
      .post<MessageResponse<ExamSubmission>>(`/exam/${examId}/submit`, data)
      .then((res) => res.data),

  getSubmissions: (examId: string) =>
    client
      .get<PaginatedResponse<ExamSubmission> | ExamSubmission[]>(`/exam/${examId}/submissions`)
      .then((res) => (Array.isArray(res.data) ? res.data : (res.data?.data ?? []))),

  updateSubmission: (submissionId: string, data: UpdateExamSubmissionDto) =>
    client
      .patch<MessageResponse<ExamSubmission>>(`/exam/submissions/${submissionId}`, data)
      .then((res) => res.data),
};
