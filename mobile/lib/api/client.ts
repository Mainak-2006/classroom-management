import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";

import type { AuthResponse } from "../types";

const DEFAULT_PORT = 3000;

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  return host ? `http://${host}:${DEFAULT_PORT}` : `http://localhost:${DEFAULT_PORT}`;
}

export const baseURL = resolveBaseUrl();

export const client = axios.create({ baseURL });
export const authClient = axios.create({ baseURL });

export interface AuthHooks {
  getRefreshToken: () => string | null;
  onTokensRefreshed: (tokens: AuthResponse) => void;
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
    const config = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _skipRefresh?: boolean;
    };

    if (error.response?.status === 401 && config && !config._retry && !config._skipRefresh) {
      config._retry = true;

      if (!refreshPromise) {
        refreshPromise = authClient
          .post<AuthResponse>("/auth/refresh", {
            refreshToken: hooks?.getRefreshToken(),
          })
          .then(({ data }) => {
            hooks?.onTokensRefreshed(data);
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
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
