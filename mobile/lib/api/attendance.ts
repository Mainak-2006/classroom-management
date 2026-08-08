import { client } from "./client";
import type {
  Attendance,
  CreateAttendanceDto,
  MessageResponse,
  PaginatedResponse,
  UpdateAttendanceDto,
} from "../types";

export const attendanceService = {
  create: (data: CreateAttendanceDto) =>
    client.post<MessageResponse<Attendance>>("/attendance", data).then((res) => res.data),

  createBulk: (data: CreateAttendanceDto[]) =>
    client.post<MessageResponse<Attendance[]>>("/attendance/bulk", data).then((res) => res.data),

  list: () =>
    client.get<PaginatedResponse<Attendance>>("/attendance").then((res) => res.data),

  get: (id: string) =>
    client.get<Attendance>(`/attendance/${id}`).then((res) => res.data),

  update: (id: string, data: UpdateAttendanceDto) =>
    client.patch<MessageResponse<Attendance>>(`/attendance/${id}`, data).then((res) => res.data),

  remove: (id: string) =>
    client.delete<MessageResponse<Attendance>>(`/attendance/${id}`).then((res) => res.data),

  byCourse: (courseId: string) =>
    client.get<Attendance[]>(`/attendance/course/${courseId}`).then((res) => res.data),

  byStudent: (studentId: string) =>
    client.get<Attendance[]>(`/attendance/student/${studentId}`).then((res) => res.data),

  byDate: (date: string) =>
    client.get<Attendance[]>(`/attendance/date/${date}`).then((res) => res.data),

  byCourseAndDate: (courseId: string, date: string) =>
    client.get<Attendance[]>(`/attendance/course/${courseId}/date/${date}`).then((res) => res.data),
};
