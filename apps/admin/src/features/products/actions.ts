"use server";

import {
  adjustStockSchema,
  factorySchema,
  getErrorMessage,
  idSchema,
  productSchema,
  productUpdateSchema,
} from "@delivery/shared";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/features/deliveries/actions";

function invalid(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? "_")] ??= issue.message;
  return { ok: false, error: "Мэдээллээ шалгана уу.", fieldErrors };
}

function duplicate(error: { code?: string } | null, message: string): ActionResult<never> | null {
  return error?.code === "23505" ? { ok: false, error: message, fieldErrors: { name: message } } : null;
}

function done() {
  // Products feed the global "new delivery" picker in the layout.
  revalidatePath("/", "layout");
}

export async function createFactory(input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsed = factorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("factories").insert(parsed.data);
  if (error) return duplicate(error, "Ийм нэртэй үйлдвэр бүртгэлтэй байна.") ?? { ok: false, error: getErrorMessage(error) };
  done();
  return { ok: true };
}

export async function updateFactory(id: string, input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = factorySchema.partial().safeParse(input);
  if (!parsedId.success) return { ok: false, error: "Үйлдвэр олдсонгүй." };
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("factories").update(parsed.data).eq("id", id);
  if (error) return duplicate(error, "Ийм нэртэй үйлдвэр бүртгэлтэй байна.") ?? { ok: false, error: getErrorMessage(error) };
  done();
  return { ok: true };
}

export async function createProduct(input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("products").insert(parsed.data);
  if (error) return duplicate(error, "Энэ үйлдвэрт ийм нэртэй бараа байна.") ?? { ok: false, error: getErrorMessage(error) };
  done();
  return { ok: true };
}

export async function updateProduct(id: string, input: unknown): Promise<ActionResult> {
  await getCurrentAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = productUpdateSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: "Бараа олдсонгүй." };
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("products").update(parsed.data).eq("id", id);
  if (error) return duplicate(error, "Энэ үйлдвэрт ийм нэртэй бараа байна.") ?? { ok: false, error: getErrorMessage(error) };
  done();
  return { ok: true };
}

export async function adjustStock(input: unknown): Promise<ActionResult<{ stock: number }>> {
  await getCurrentAdmin();
  const parsed = adjustStockSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product_id: parsed.data.productId,
    p_change: parsed.data.change,
    p_reason: parsed.data.reason,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return { ok: false, error: getErrorMessage(error) };
  done();
  return { ok: true, data: { stock: data } };
}
