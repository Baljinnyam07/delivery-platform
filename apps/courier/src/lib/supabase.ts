import { createClient } from "@supabase/supabase-js";
import type { Database } from "@delivery/shared";
import { AppState, Platform } from "react-native";
import { secureStorage } from "./secure-storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see apps/courier/.env.example)");
}

/**
 * Runs as the signed-in courier: RLS and RPC role checks apply to everything.
 * Only the public (publishable) key ships in the app.
 */
export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground (Expo/Supabase guidance).
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
