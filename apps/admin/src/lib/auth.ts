import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentAdmin = {
  id: string;
  fullName: string;
  email: string | null;
};

/**
 * Data access layer entry point: returns the signed-in, active ADMIN or
 * redirects. Deduplicated per request with React `cache`.
 * RLS and RPCs enforce the same rule again in the database.
 */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.role !== "ADMIN" || !profile.is_active) {
    redirect("/auth/signout?reason=forbidden");
  }

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: (claimsData?.claims?.email as string | undefined) ?? null,
  };
});
