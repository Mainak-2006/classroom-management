import { client } from "./client";
import type {
  Admin,
  CreateAdminDto,
  MessageResponse,
  PaginatedResponse,
  UpdateAdminDto,
} from "../types";

export const adminService = {
  create: (data: CreateAdminDto) =>
    client.post<MessageResponse<Admin>>("/admin", data).then((res) => res.data),

  createBulk: (data: CreateAdminDto[]) =>
    client.post<MessageResponse<Admin[]>>("/admin/bulk", data).then((res) => res.data),

  getProfile: () =>
    client.get<Admin>("/admin/profile").then((res) => res.data),

  list: () =>
    client.get<PaginatedResponse<Admin>>("/admin").then((res) => res.data),

  get: (id: string) =>
    client.get<Admin>(`/admin/${id}`).then((res) => res.data),

  update: (id: string, data: UpdateAdminDto) =>
    client.patch<MessageResponse<Admin>>(`/admin/${id}`, data).then((res) => res.data),

  remove: (id: string) =>
    client.delete<MessageResponse<Admin>>(`/admin/${id}`).then((res) => res.data),
};
