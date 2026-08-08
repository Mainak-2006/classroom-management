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
    client.get<Exam[]>(`/exam/course/${courseId}`).then((res) => res.data),

  byStatus: (status: ExamStatus) =>
    client.get<Exam[]>(`/exam/status/${status}`).then((res) => res.data),

  submissionsByStudent: (studentId: string) =>
    client.get<ExamSubmission[]>(`/exam/submissions/student/${studentId}`).then((res) => res.data),

  submit: (examId: string, data: CreateExamSubmissionDto) =>
    client.post<MessageResponse<ExamSubmission>>(`/exam/${examId}/submit`, data).then((res) => res.data),

  getSubmissions: (examId: string) =>
    client.get<ExamSubmission[]>(`/exam/${examId}/submissions`).then((res) => res.data),

  updateSubmission: (submissionId: string, data: UpdateExamSubmissionDto) =>
    client
      .patch<MessageResponse<ExamSubmission>>(`/exam/submissions/${submissionId}`, data)
      .then((res) => res.data),
};
