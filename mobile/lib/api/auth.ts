import { client } from "./client";
import type {
  AuthResponse,
  LogoutDto,
  LogoutResponse,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from "../types";

export const authService = {
  login: (data: LoginDto) =>
    client.post<AuthResponse>("/auth/login", data).then((res) => res.data),

  register: (data: RegisterDto) =>
    client.post<AuthResponse>("/auth/register", data).then((res) => res.data),

  refresh: (data: RefreshTokenDto) =>
    client.post<AuthResponse>("/auth/refresh", data).then((res) => res.data),

  logout: (data: LogoutDto) =>
    client.post<LogoutResponse>("/auth/logout", data).then((res) => res.data),
};
