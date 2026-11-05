"use server";

import { loginSchema } from "@delivery/shared";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; email?: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "");

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, email };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: "И-мэйл эсвэл нууц үг буруу байна.", email };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || profile.role !== "ADMIN") {
    await supabase.auth.signOut();
    return { error: "Зөвхөн админ эрхтэй хэрэглэгч нэвтрэх боломжтой.", email };
  }
  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "Таны эрх идэвхгүй байна.", email };
  }

  redirect("/");
}
