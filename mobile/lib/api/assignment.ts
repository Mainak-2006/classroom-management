import { client } from "./client";
import type {
  Assignment,
  AssignmentStatus,
  CreateAssignmentDto,
  MessageResponse,
  PaginatedResponse,
  UpdateAssignmentDto,
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
};
