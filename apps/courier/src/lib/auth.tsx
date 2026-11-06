import type { Session } from "@supabase/supabase-js";
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { unregisterPush } from "./push";
import { supabase } from "./supabase";

export type CourierProfile = { id: string; full_name: string; phone: string | null };

type AuthState = {
  /** `undefined` while restoring the stored session on app start. */
  session: Session | null | undefined;
  profile: CourierProfile | null;
  /** Shown on the login screen after a forced sign-out (wrong role, deactivated). */
  notice: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

type LoadResult = { profile: CourierProfile | null; error: string | null; offline?: boolean };

/** Loads the profile and enforces: only ACTIVE COURIER accounts may use the app. */
async function loadCourier(userId: string): Promise<LoadResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, is_active")
    .eq("id", userId)
    .maybeSingle();
  // A request error (no network, timeout) says nothing about the role.
  if (error) return { profile: null, error: "Холболтын алдаа. Дахин оролдоно уу.", offline: true };
  if (!data || data.role !== "COURIER") return { profile: null, error: "Зөвхөн курьерын эрхээр нэвтрэх боломжтой." };
  if (!data.is_active) return { profile: null, error: "Таны эрх идэвхгүй байна. Админтай холбогдоно уу." };
  return { profile: { id: data.id, full_name: data.full_name, phone: data.phone }, error: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<CourierProfile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const apply = useCallback(async (next: Session | null) => {
    if (!next) {
      setProfile(null);
      setSession(null);
      return;
    }
    const { profile: p, error, offline } = await loadCourier(next.user.id);
    if (offline) {
      // App opened without connectivity: keep the courier signed in with what the
      // token tells us. Every read and action is still checked by RLS/RPCs.
      const meta = next.user.user_metadata as { full_name?: string; phone?: string } | undefined;
      setProfile({ id: next.user.id, full_name: meta?.full_name ?? next.user.email ?? "", phone: meta?.phone ?? null });
      setSession(next);
      return;
    }
    if (!p) {
      await supabase.auth.signOut();
      setNotice(error);
      setProfile(null);
      setSession(null);
      return;
    }
    setProfile(p);
    setSession(next);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      // Token refreshes don't change who is signed in — avoid re-querying the profile.
      if (event === "TOKEN_REFRESHED") {
        setSession(next);
        return;
      }
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setSession(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [apply]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setNotice(null);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) return "И-мэйл эсвэл нууц үг буруу байна.";
      const { profile: p, error: roleError } = await loadCourier(data.session.user.id);
      if (!p) {
        await supabase.auth.signOut();
        return roleError;
      }
      setProfile(p);
      setSession(data.session);
      return null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    // Clear the push token while the session is still valid (RLS needs it).
    if (profile) await unregisterPush(profile.id);
    await supabase.auth.signOut();
  }, [profile]);

  return <AuthContext value={{ session, profile, notice, signIn, signOut }}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** For screens rendered only when signed in. */
export function useCourier(): CourierProfile {
  const { profile } = useAuth();
  if (!profile) throw new Error("useCourier used while signed out");
  return profile;
}
