"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@delivery/shared";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser client — used only for Realtime subscriptions. Mutations go through Server Actions. */
export function getBrowserClient() {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}
