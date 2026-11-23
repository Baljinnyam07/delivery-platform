"use server";

import { expenseSchema, getErrorMessage, idSchema } from "@delivery/shared";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/deliveries/actions";

/** Records an expense; a shared one (no factory) is split by the DB. */
export async function createExpense(input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "_")] ??= issue.message;
    return { ok: false, error: "Мэдээллээ шалгана уу.", fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_expense", {
    p_id: parsed.data.id,
    p_spent_on: parsed.data.spent_on,
    p_amount: parsed.data.amount,
    p_description: parsed.data.description,
    p_factory_id: parsed.data.factory_id ?? undefined,
  });
  if (error) return { ok: false, error: getErrorMessage(error) };

  revalidatePath("/reports");
  return { ok: true };
}

/** Soft delete: the row stays for the audit trail, the report ignores it. */
export async function voidExpense(id: string): Promise<ActionResult> {
  await getCurrentAdmin();
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Зардал олдсонгүй." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_expense", { p_id: id });
  if (error) return { ok: false, error: getErrorMessage(error) };

  revalidatePath("/reports");
  return { ok: true };
}
