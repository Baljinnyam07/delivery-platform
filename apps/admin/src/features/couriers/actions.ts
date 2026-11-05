"use server";

import {
  courierCreateSchema,
  getErrorMessage,
  idSchema,
  profileUpdateSchema,
  setCourierActiveSchema,
} from "@delivery/shared";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/deliveries/actions";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0] ?? "_")] ??= issue.message;
  return out;
}

function done() {
  revalidatePath("/", "layout");
}

/** Creates an email/password courier account (decision D2). Profile is created by DB trigger. */
export async function createCourier(input: unknown): Promise<ActionResult<{ id: string }>> {
  await getCurrentAdmin();
  const parsed = courierCreateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Мэдээллээ шалгана уу.", fieldErrors: fieldErrors(parsed.error) };

  const { email, password, full_name, phone } = parsed.data;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "COURIER" },
    user_metadata: { full_name, phone },
  });

  if (error || !data.user) {
    if (error?.code === "email_exists" || /already been registered/i.test(error?.message ?? "")) {
      return { ok: false, error: "Энэ и-мэйл бүртгэлтэй байна.", fieldErrors: { email: "Энэ и-мэйл бүртгэлтэй байна." } };
    }
    if (error?.code === "weak_password") {
      return { ok: false, error: "Нууц үг хэт сул байна.", fieldErrors: { password: "Нууц үг хэт сул байна." } };
    }
    return { ok: false, error: "Курьер үүсгэж чадсангүй. Дахин оролдоно уу." };
  }

  // The DB trigger must have created the profile. If not, roll the auth user back
  // so no account exists that can sign in but is invisible to the admin.
  const { data: profile } = await admin.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  if (!profile) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, error: "Курьер үүсгэж чадсангүй. Дахин оролдоно уу." };
  }

  done();
  return { ok: true, data: { id: data.user.id } };
}

export async function updateCourier(id: string, input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Курьер олдсонгүй." };
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Мэдээллээ шалгана уу.", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", id)
    .eq("role", "COURIER")
    .select("id");
  if (error) return { ok: false, error: getErrorMessage(error) };
  if (!data?.length) return { ok: false, error: "Курьер олдсонгүй." };

  done();
  return { ok: true };
}

export async function setCourierActive(input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsed = setCourierActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Мэдээллээ шалгана уу." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_courier_active", {
    p_courier_id: parsed.data.courierId,
    p_active: parsed.data.active,
  });
  if (error) return { ok: false, error: getErrorMessage(error) };

  done();
  return { ok: true };
}

const resetPasswordSchema = z.object({
  courierId: idSchema,
  password: courierCreateSchema.shape.password,
});

/** Couriers have no self-service reset in MVP; the admin sets a new password. */
export async function resetCourierPassword(input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Мэдээллээ шалгана уу.", fieldErrors: fieldErrors(parsed.error) };

  // Only courier accounts may be changed here — never another admin.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", parsed.data.courierId)
    .maybeSingle();
  if (profile?.role !== "COURIER") return { ok: false, error: "Курьер олдсонгүй." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.courierId, {
    password: parsed.data.password,
  });
  if (error) {
    return error.code === "weak_password"
      ? { ok: false, error: "Нууц үг хэт сул байна.", fieldErrors: { password: "Нууц үг хэт сул байна." } }
      : { ok: false, error: "Нууц үг солиход алдаа гарлаа." };
  }
  return { ok: true };
}
