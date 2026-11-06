import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Supabase auth storage backed by the device keychain/keystore.
 *
 * Supabase sessions are larger than the ~2 KB that some iOS versions accept
 * for a single SecureStore value, so values are split into chunks:
 *   <key>.n = chunk count, <key>.0 … <key>.{n-1} = chunks.
 *
 * Web (dev preview only) falls back to localStorage — SecureStore has no web support.
 */
const CHUNK = 1800;
// SecureStore keys allow only [A-Za-z0-9._-]
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

const web = {
  getItem: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
  removeItem: async (key: string) => globalThis.localStorage?.removeItem(key),
};

async function removeChunks(key: string) {
  const count = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
  await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)));
  await SecureStore.deleteItemAsync(`${key}.n`);
}

const native = {
  async getItem(rawKey: string): Promise<string | null> {
    const key = safe(rawKey);
    const count = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
    if (!count) return null;
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
    if (parts.some((p) => p == null)) return null; // partial write → treat as signed out
    return parts.join("");
  },
  async setItem(rawKey: string, value: string): Promise<void> {
    const key = safe(rawKey);
    await removeChunks(key);
    const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, "g")) ?? [""];
    await Promise.all(chunks.map((c, i) => SecureStore.setItemAsync(`${key}.${i}`, c)));
    await SecureStore.setItemAsync(`${key}.n`, String(chunks.length)); // written last = commit marker
  },
  async removeItem(rawKey: string): Promise<void> {
    await removeChunks(safe(rawKey));
  },
};

export const secureStorage = Platform.OS === "web" ? web : native;
