import "server-only";

import { PAYMENT_METHODS, ubDayRange, type PaymentMethod } from "@delivery/shared";
import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/features/stats/queries";

export const PAYMENTS_LIMIT = 200;

export function parseMethod(value: string | string[] | undefined): PaymentMethod | null {
  const v = Array.isArray(value) ? value[0] : value;
  return (PAYMENT_METHODS as readonly string[]).includes(v ?? "") ? (v as PaymentMethod) : null;
}

export async function listPayments(range: DateRange, method: PaymentMethod | null) {
  const supabase = await createClient();
  const r = ubDayRange(range.from, range.to);
  let query = supabase
    .from("payment_records")
    .select(
      "id, amount, method, recorded_at, recorded_by, note, voided_at, void_reason, voided_by, delivery:deliveries(id, code, customer_name)",
    )
    .gte("recorded_at", r.from)
    .lt("recorded_at", r.to)
    .order("recorded_at", { ascending: false })
    .limit(PAYMENTS_LIMIT);
  if (method) query = query.eq("method", method);

  const { data, error } = await query;
  if (error) throw error;

  const ids = [...new Set((data ?? []).flatMap((p) => [p.recorded_by, p.voided_by]).filter((v): v is string => Boolean(v)))];
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, full_name, role").in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  return (data ?? []).map((p) => ({
    ...p,
    recordedBy: byId.get(p.recorded_by) ?? null,
    voidedBy: p.voided_by ? (byId.get(p.voided_by)?.full_name ?? null) : null,
  }));
}

/** Delivered but not paid — money that should already have been collected. */
export async function listDeliveredUnpaid(limit = 20) {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("deliveries")
    .select("id, code, customer_name, amount_due, delivered_at, courier:profiles!deliveries_courier_id_fkey(id, full_name)", {
      count: "exact",
    })
    .eq("status", "DELIVERED")
    .eq("payment_status", "UNPAID")
    .gt("amount_due", 0)
    .order("delivered_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}
