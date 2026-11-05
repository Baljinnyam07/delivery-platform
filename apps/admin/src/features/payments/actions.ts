"use server";

import { getErrorMessage, recordPaymentSchema, voidPaymentSchema } from "@delivery/shared";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/deliveries/actions";

/** Admin records the one full payment (D4). The DB checks amount = amount_due. */
export async function recordPayment(input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Мэдээллээ шалгана уу." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_payment", {
    p_delivery_id: parsed.data.deliveryId,
    p_method: parsed.data.method,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return { ok: false, error: getErrorMessage(error) };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function voidPayment(input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsed = voidPaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Шалтгаанаа заавал оруулна уу.", fieldErrors: { reason: "Шалтгаанаа заавал оруулна уу." } };

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_payment", {
    p_payment_id: parsed.data.paymentId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: getErrorMessage(error) };

  revalidatePath("/", "layout");
  return { ok: true };
}
