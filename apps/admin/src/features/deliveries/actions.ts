"use server";

import {
  assignDeliverySchema,
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
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.from("deliveries").insert(parsed.data).select("id").single();

  if (error) {
    // Idempotent submit: same client-generated id already created.
    if (error.code === "23505" && parsed.data.id) {
      done();
      return { ok: true, data: { id: parsed.data.id } };
    }
    return { ok: false, error: getErrorMessage(error) };
  }

  done();
  return { ok: true, data: { id: data.id } };
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
