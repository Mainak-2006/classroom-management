import { client } from "./client";
import type {
  Assignment,
  Attendance,
  Course,
  CreateStudentDto,
  MessageResponse,
  PaginatedResponse,
  Student,
  UpdateStudentDto,
  ExamSubmission,
} from "../types";

export const studentService = {
  create: (data: CreateStudentDto) =>
    client.post<MessageResponse<Student>>("/student", data).then((res) => res.data),

  createBulk: (data: CreateStudentDto[]) =>
    client.post<MessageResponse<Student[]>>("/student/bulk", data).then((res) => res.data),

  getProfile: () =>
    client.get<Student>("/student/profile").then((res) => res.data),

  getAttendance: () =>
    client
      .get<PaginatedResponse<Attendance>>("/student/attendance")
      .then((res) => res.data.data),

  getCourses: () =>
    client.get<PaginatedResponse<Course>>("/student/courses").then((res) => res.data.data),

  getExams: () =>
    client
      .get<PaginatedResponse<ExamSubmission>>("/student/exams")
      .then((res) => res.data.data),

  getAssignments: () =>
    client.get<PaginatedResponse<Assignment>>("/student/assignments").then((res) => res.data.data),

  list: () =>
    client.get<PaginatedResponse<Student>>("/student").then((res) => res.data),

  listEnrollable: (limit = 100) =>
    client
      .get<PaginatedResponse<Student>>(`/student/enrollable?limit=${limit}`)
      .then((res) => res.data),

  get: (id: string) =>
    client.get<Student>(`/student/${id}`).then((res) => res.data),

  update: (id: string, data: UpdateStudentDto) =>
    client.patch<MessageResponse<Student>>(`/student/${id}`, data).then((res) => res.data),

  remove: (id: string) =>
    client.delete<MessageResponse<Student>>(`/student/${id}`).then((res) => res.data),
};
