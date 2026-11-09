import { getErrorMessage, type PaymentMethod } from "@delivery/shared";
import { emitDeliveriesChanged } from "@/lib/events";
import { supabase } from "@/lib/supabase";

// RLS returns only the courier's own deliveries. Unassigned ones come from
// list_available_deliveries() with the customer phone hidden (decision D3).
const COLUMNS =
  "id, code, status, customer_name, customer_phone, address, address_note, latitude, longitude, package_description, notes, amount_due, payment_status, payment_method, scheduled_date, assigned_at, started_at, delivered_at, cancelled_at, cancel_reason" as const;

function fail(error: { code?: string; message?: string } | null): never {
  throw new Error(getErrorMessage(error));
}

export async function fetchActive() {
  const { data, error } = await supabase
    .from("deliveries")
    .select(COLUMNS)
    .in("status", ["ASSIGNED", "IN_PROGRESS"])
    .order("assigned_at", { ascending: true });
  if (error) fail(error);
  return data;
}

export type MyDelivery = Awaited<ReturnType<typeof fetchActive>>[number];

export async function fetchAvailable() {
  const { data, error } = await supabase.rpc("list_available_deliveries");
  if (error) fail(error);
  return data ?? [];
}

export type AvailableItem = Awaited<ReturnType<typeof fetchAvailable>>[number];

export async function fetchHistory() {
  const { data, error } = await supabase
    .from("deliveries")
    .select(COLUMNS)
    .in("status", ["DELIVERED", "CANCELLED"])
    .order("delivered_at", { ascending: false, nullsFirst: false })
    .order("cancelled_at", { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) fail(error);
  return data;
}

/** `null` when the delivery is not (or no longer) this courier's. */
export async function fetchDelivery(id: string) {
  const [delivery, payments, items] = await Promise.all([
    supabase.from("deliveries").select(COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("payment_records")
      .select("id, amount, method, recorded_at, voided_at")
      .eq("delivery_id", id)
      .is("voided_at", null)
      .order("recorded_at", { ascending: false })
      .limit(1),
    supabase
      .from("delivery_items")
      .select("id, product_name, unit, quantity")
      .eq("delivery_id", id)
      .order("created_at"),
  ]);
  if (delivery.error) fail(delivery.error);
  if (!delivery.data) return null;
  return { ...delivery.data, payment: payments.data?.[0] ?? null, items: items.data ?? [] };
}

export type DeliveryDetail = NonNullable<Awaited<ReturnType<typeof fetchDelivery>>>;

// ---------------- Actions (atomic RPCs in the database) ----------------

async function rpcDone(promise: PromiseLike<{ error: { code?: string; message?: string } | null }>) {
  const { error } = await promise;
  if (error) fail(error);
  emitDeliveriesChanged();
}

export const claimDelivery = (id: string) => rpcDone(supabase.rpc("claim_delivery", { p_delivery_id: id }));

export const startDelivery = (id: string) => rpcDone(supabase.rpc("start_delivery", { p_delivery_id: id }));

export const completeDelivery = (id: string) => rpcDone(supabase.rpc("complete_delivery", { p_delivery_id: id }));

export const returnDelivery = (id: string, reason: string) =>
  rpcDone(supabase.rpc("return_delivery", { p_delivery_id: id, p_reason: reason }));

export const recordPayment = (id: string, method: PaymentMethod, amount: number) =>
  rpcDone(supabase.rpc("record_payment", { p_delivery_id: id, p_method: method, p_amount: amount }));
