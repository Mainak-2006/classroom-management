import { Platform } from "react-native";

import * as SecureStore from "expo-secure-store";

export const STORAGE_KEYS = {
  accessToken: "auth.accessToken",
  refreshToken: "auth.refreshToken",
  user: "auth.user",
} as const;

const isWeb = Platform.OS === "web";

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return globalThis.sessionStorage?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.sessionStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.sessionStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function clearAuthStorage(): Promise<void> {
  await Promise.all(Object.values(STORAGE_KEYS).map((key) => deleteItem(key)));
}
