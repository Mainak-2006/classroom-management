import { client } from "./client";
import type {
  Course,
  CreateCourseDto,
  MessageResponse,
  PaginatedResponse,
  Student,
  Teacher,
  UpdateCourseDto,
} from "../types";

export const courseService = {
  create: (data: CreateCourseDto) =>
    client.post<MessageResponse<Course>>("/course", data).then((res) => res.data),

  createBulk: (data: CreateCourseDto[]) =>
    client.post<MessageResponse<Course[]>>("/course/bulk", data).then((res) => res.data),

  list: () =>
    client.get<PaginatedResponse<Course>>("/course").then((res) => res.data),

  get: (id: string) =>
    client.get<Course>(`/course/${id}`).then((res) => res.data),

  update: (id: string, data: UpdateCourseDto) =>
    client.patch<MessageResponse<Course>>(`/course/${id}`, data).then((res) => res.data),

  remove: (id: string) =>
    client.delete<MessageResponse<Course>>(`/course/${id}`).then((res) => res.data),

  assignTeacher: (courseId: string, teacherId: string) =>
    client
      .post<MessageResponse<Course>>(`/course/${courseId}/teacher/${teacherId}`)
      .then((res) => res.data),

  removeTeacher: (courseId: string) =>
    client
      .delete<MessageResponse<Course>>(`/course/${courseId}/teacher`)
      .then((res) => res.data),

  addStudent: (courseId: string, studentId: string) =>
    client
      .post<MessageResponse<Course>>(`/course/${courseId}/students/${studentId}`)
      .then((res) => res.data),

  removeStudent: (courseId: string, studentId: string) =>
    client
      .delete<MessageResponse<Course>>(`/course/${courseId}/students/${studentId}`)
      .then((res) => res.data),

  getStudents: (courseId: string) =>
    client
      .get<PaginatedResponse<Student>>(`/course/${courseId}/students`)
      .then((res) => res.data.data),

  getTeacher: (courseId: string) =>
    client.get<Teacher>(`/course/${courseId}/teacher`).then((res) => res.data),

  bySemester: (semester: number) =>
    client
      .get<PaginatedResponse<Course>>(`/course/semester/${semester}`)
      .then((res) => res.data.data),

  byDepartment: (department: string) =>
    client
      .get<PaginatedResponse<Course>>(`/course/department/${department}`)
      .then((res) => res.data.data),

  byTeacher: (teacherId: string) =>
    client
      .get<PaginatedResponse<Course>>(`/course/teacher/${teacherId}`)
      .then((res) => res.data.data),
};
