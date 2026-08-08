import { client } from "./client";
import type {
  Attendance,
  Course,
  CreateAttendanceDto,
  CreateTeacherDto,
  MessageResponse,
  PaginatedResponse,
  Teacher,
  UpdateTeacherDto,
} from "../types";

export const teacherService = {
  create: (data: CreateTeacherDto) =>
    client.post<MessageResponse<Teacher>>("/teacher", data).then((res) => res.data),

  createBulk: (data: CreateTeacherDto[]) =>
    client.post<MessageResponse<Teacher[]>>("/teacher/bulk", data).then((res) => res.data),

  getProfile: () =>
    client.get<{ id: string; email: string; role: string; jti: string }>("/teacher/profile").then((res) => res.data),

  getCourses: () =>
    client.get<Course[]>("/teacher/courses").then((res) => res.data),

  markAttendance: (data: CreateAttendanceDto) =>
    client.post<MessageResponse<Attendance>>("/teacher/attendance", data).then((res) => res.data),

  getCourseAttendance: (courseId: string) =>
    client.get<Attendance[]>(`/teacher/attendance/course/${courseId}`).then((res) => res.data),

  list: () =>
    client.get<PaginatedResponse<Teacher>>("/teacher").then((res) => res.data),

  get: (id: string) =>
    client.get<Teacher>(`/teacher/${id}`).then((res) => res.data),

  update: (id: string, data: UpdateTeacherDto) =>
    client.patch<MessageResponse<Teacher>>(`/teacher/${id}`, data).then((res) => res.data),

  remove: (id: string) =>
    client.delete<MessageResponse<Teacher>>(`/teacher/${id}`).then((res) => res.data),
};
