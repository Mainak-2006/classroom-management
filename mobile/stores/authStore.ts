import { create } from "zustand";

import { authService } from "../lib/api/auth";
import { setAccessToken, setAuthHooks } from "../lib/api/client";
import { clearAuthStorage, getItem, setItem, STORAGE_KEYS } from "../lib/storage";
import type { AuthResponse, AuthUser, LoginDto, RegisterDto } from "../lib/types";

export type AuthStatus = "hydrating" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrate: () => Promise<void>;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  applyAuth: (response: AuthResponse) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "hydrating",
  user: null,
  accessToken: null,
  refreshToken: null,

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userRaw] = await Promise.all([
        getItem(STORAGE_KEYS.accessToken),
        getItem(STORAGE_KEYS.refreshToken),
        getItem(STORAGE_KEYS.user),
      ]);

      if (!accessToken || !refreshToken) {
        await clearAuthStorage();
        set({ status: "unauthenticated", user: null, accessToken: null, refreshToken: null });
        return;
      }

      let user: AuthUser | null = null;
      if (userRaw) {
        try {
          user = JSON.parse(userRaw) as AuthUser;
        } catch {
          user = null;
        }
      }

      setAccessToken(accessToken);
      set({ user, accessToken, refreshToken, status: "hydrating" });

      const freshUser = await authService.me();
      set({ user: freshUser, status: "authenticated" });
      await setItem(STORAGE_KEYS.user, JSON.stringify(freshUser));
    } catch {
      setAccessToken(null);
      await clearAuthStorage();
      set({ status: "unauthenticated", user: null, accessToken: null, refreshToken: null });
    }
  },

  applyAuth: async (response) => {
    const { accessToken, refreshToken, user } = response;
    setAccessToken(accessToken);
    set({ status: "authenticated", user, accessToken, refreshToken });
    try {
      await Promise.all([
        setItem(STORAGE_KEYS.accessToken, accessToken),
        setItem(STORAGE_KEYS.refreshToken, refreshToken),
        setItem(STORAGE_KEYS.user, JSON.stringify(user)),
      ]);
    } catch {
      return Promise.reject(new Error("Failed to store auth data"));
    }
  },

  login: async (data) => {
    const response = await authService.login(data);
    await get().applyAuth(response);
  },

  register: async (data) => {
    const response = await authService.register(data);
    await get().applyAuth(response);
  },

  logout: async () => {
    const { status, accessToken, refreshToken } = get();
    if (status === "unauthenticated") {
      return;
    }
    if (refreshToken) {
      try {
        await authService.logout({ refreshToken, accessToken: accessToken ?? undefined });
      } catch {
        // ignore network/refresh failures on logout
      }
    }
    setAccessToken(null);
    await clearAuthStorage();
    set({ status: "unauthenticated", user: null, accessToken: null, refreshToken: null });
  },
}));

setAuthHooks({
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokensRefreshed: (tokens) => useAuthStore.getState().applyAuth(tokens),
  onSessionExpired: () => {
    void useAuthStore.getState().logout();
  },
});
