"use server";

import {
  assignDeliverySchema,
  deliveryCreateExtrasSchema,
  deliveryCreateSchema,
  deliveryReasonSchema,
  deliveryUpdateSchema,
  getErrorMessage,
  idSchema,
  reassignDeliverySchema,
} from "@delivery/shared";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    out[key] ??= issue.message;
  }
  return out;
}

function invalid(error: z.ZodError): ActionResult<never> {
  return { ok: false, error: "Мэдээллээ шалгана уу.", fieldErrors: fieldErrors(error) };
}

function done() {
  // Layout holds the sidebar's unassigned counter, so refresh everything.
  revalidatePath("/", "layout");
}

// ---------------- CRUD ----------------

export async function createDelivery(input: unknown): Promise<ActionResult<{ id: string }>> {
  await getCurrentAdmin();
  const parsed = deliveryCreateSchema.safeParse(input);
  const extras = deliveryCreateExtrasSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!extras.success) return invalid(extras.error);

  // One transaction in the DB: delivery + line items + stock reservation
  // (+ prepaid payment). Idempotent on the client-generated id.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_delivery", {
    p_delivery: parsed.data,
    p_items: extras.data.items,
    p_amount: extras.data.items.length ? (extras.data.amount_override ?? undefined) : parsed.data.amount_due,
    p_payment_method: extras.data.prepaid_method ?? undefined,
  });
  if (error) {
    const fieldErrors =
      error.message === "NOT_ENOUGH_STOCK" || error.message === "PRODUCT_NOT_FOUND" || error.message === "ITEMS_INVALID"
        ? { items: getErrorMessage(error) }
        : undefined;
    return { ok: false, error: getErrorMessage(error), fieldErrors };
  }

  done();
  return { ok: true, data: { id: data } };
}

export async function updateDelivery(id: string, input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = deliveryUpdateSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: "Хүргэлт олдсонгүй." };
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.from("deliveries").update(parsed.data).eq("id", id).select("id");
  if (error) return { ok: false, error: getErrorMessage(error) };
  if (!data?.length) return { ok: false, error: "Хүргэлт олдсонгүй." };

  done();
  return { ok: true };
}

// ---------------- Assignment / status (RPC) ----------------

export async function assignDelivery(input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsed = assignDeliverySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_delivery", {
    p_delivery_id: parsed.data.deliveryId,
    p_courier_id: parsed.data.courierId,
  });
  if (error) return { ok: false, error: getErrorMessage(error) };

  done();
  return { ok: true };
}

export async function reassignDelivery(input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsed = reassignDeliverySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("reassign_delivery", {
    p_delivery_id: parsed.data.deliveryId,
    p_courier_id: parsed.data.courierId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: getErrorMessage(error) };

  done();
  return { ok: true };
}

export async function unassignDelivery(input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsed = deliveryReasonSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("unassign_delivery", {
    p_delivery_id: parsed.data.deliveryId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: getErrorMessage(error) };

  done();
  return { ok: true };
}

export async function cancelDelivery(input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsed = deliveryReasonSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_delivery", {
    p_delivery_id: parsed.data.deliveryId,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, error: getErrorMessage(error) };

  done();
  return { ok: true };
}
