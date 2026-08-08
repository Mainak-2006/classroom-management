import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import type { AuthResponse } from "../types";

const DEFAULT_PORT = 3000;

export const baseURL = process.env.EXPO_PUBLIC_API_URL || `http://localhost:${DEFAULT_PORT}`;

export interface ApiRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _skipRefresh?: boolean;
}

export const client = axios.create({ baseURL, timeout: 10000 });
export const authClient = axios.create({ baseURL, timeout: 10000 });

export interface AuthHooks {
  getRefreshToken: () => string | null;
  onTokensRefreshed: (tokens: AuthResponse) => Promise<void>;
  onSessionExpired: () => void;
}

let accessToken: string | null = null;
let hooks: AuthHooks | null = null;
let refreshPromise: Promise<string> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setAuthHooks(next: AuthHooks): void {
  hooks = next;
}

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const config = error.config as ApiRequestConfig;

    if (error.response?.status === 401 && config && !config._retry && !config._skipRefresh) {
      const refreshToken = hooks?.getRefreshToken();
      if (!refreshToken) {
        return Promise.reject(error);
      }

      config._retry = true;

      if (!refreshPromise) {
        refreshPromise = authClient
          .post<AuthResponse>("/auth/refresh", { refreshToken })
          .then(async ({ data }) => {
            await hooks?.onTokensRefreshed(data);
            return data.accessToken;
          })
          .catch((refreshError) => {
            hooks?.onSessionExpired();
            return Promise.reject(refreshError);
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const token = await refreshPromise;
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
      return client(config);
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join("\n");
    if (typeof message === "string") return message;
    if (!error.response) {
      return `Cannot reach the server at ${baseURL}. Check your connection and that the server is running.`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
