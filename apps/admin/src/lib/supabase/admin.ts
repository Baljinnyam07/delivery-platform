import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@delivery/shared";
import { SUPABASE_URL } from "./env";

/**
 * Service-role client. BYPASSES RLS — use only for Auth admin operations
 * (creating courier accounts, resetting passwords, reading emails), and only
 * after `getCurrentAdmin()` has verified the caller. Never import from client code.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing SUPABASE_SECRET_KEY (server only, see apps/admin/.env.example)");
  return createClient<Database>(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
