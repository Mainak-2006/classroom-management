import { ApiRequestConfig, client } from "./client";
import type { AuthResponse, AuthUser, LogoutDto, LogoutResponse, LoginDto, RegisterDto } from "../types";

const AUTH_CONFIG: ApiRequestConfig = { _skipRefresh: true };

export const authService = {
  login: (data: LoginDto) =>
    client.post<AuthResponse>("/auth/login", data, AUTH_CONFIG).then((res) => res.data),

  register: (data: RegisterDto) =>
    client.post<AuthResponse>("/auth/register", data, AUTH_CONFIG).then((res) => res.data),

  logout: (data: LogoutDto) =>
    client.post<LogoutResponse>("/auth/logout", data, AUTH_CONFIG).then((res) => res.data),

  me: () => client.get<AuthUser>("/auth/me").then((res) => res.data),
};
