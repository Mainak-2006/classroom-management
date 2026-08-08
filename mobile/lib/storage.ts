import * as SecureStore from "expo-secure-store";

export const STORAGE_KEYS = {
  accessToken: "auth.accessToken",
  refreshToken: "auth.refreshToken",
  user: "auth.user",
} as const;

export async function getItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export async function clearAuthStorage(): Promise<void> {
  await Promise.all(
    Object.values(STORAGE_KEYS).map((key) => SecureStore.deleteItemAsync(key)),
  );
}
