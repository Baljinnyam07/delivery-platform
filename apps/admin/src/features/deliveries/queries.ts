import "server-only";

import {
  DELIVERY_STATUSES,
  PAYMENT_STATUSES,
  type DeliveryStatus,
  type PaymentStatus,
} from "@delivery/shared";
import { createClient } from "@/lib/supabase/server";

export const PAGE_SIZE = 20;

export type DeliveryFilters = {
  status: DeliveryStatus | "ALL";
  q: string;
  courierId: string | null;
  payment: PaymentStatus | null;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFilters(params: RawParams): DeliveryFilters {
  const status = first(params.status);
  const payment = first(params.payment);
  const page = Number.parseInt(first(params.page), 10);
  return {
    status: (DELIVERY_STATUSES as readonly string[]).includes(status) ? (status as DeliveryStatus) : "ALL",
    q: first(params.q).trim().slice(0, 100),
    courierId: /^[0-9a-f-]{36}$/i.test(first(params.courier)) ? first(params.courier) : null,
    payment: (PAYMENT_STATUSES as readonly string[]).includes(payment) ? (payment as PaymentStatus) : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** PostgREST `or()` filter for the search box. Strips characters that would break the filter syntax. */
export function searchFilter(q: string): string | null {
  const term = q.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim();
  if (!term) return null;
  const digits = term.replace(/[\s-]/g, "");
  const parts = [
    `code.ilike.%${term}%`,
    `customer_name.ilike.%${term}%`,
    `address.ilike.%${term}%`,
  ];
  if (/^\d+$/.test(digits)) parts.push(`customer_phone.ilike.%${digits}%`);
  return parts.join(",");
}

const LIST_COLUMNS =
  "id, code, customer_name, customer_phone, address, address_note, package_description, notes, amount_due, latitude, longitude, scheduled_date, status, payment_status, payment_method, courier_id, created_at, courier:profiles!deliveries_courier_id_fkey(id, full_name)" as const;

const DETAIL_COLUMNS =
  `${LIST_COLUMNS}, assigned_at, started_at, delivered_at, cancelled_at, cancel_reason, created_by` as const;

export async function listDeliveries(filters: DeliveryFilters) {
  const supabase = await createClient();
  const search = searchFilter(filters.q);

  // Same filters minus status → counts for the status tabs.
  const base = () => {
    let query = supabase.from("deliveries").select("id", { count: "exact", head: true });
    if (search) query = query.or(search);
    if (filters.courierId) query = query.eq("courier_id", filters.courierId);
    if (filters.payment) query = query.eq("payment_status", filters.payment);
    return query;
  };

  let list = supabase.from("deliveries").select(LIST_COLUMNS, { count: "exact" });
  if (search) list = list.or(search);
  if (filters.courierId) list = list.eq("courier_id", filters.courierId);
  if (filters.payment) list = list.eq("payment_status", filters.payment);
  if (filters.status !== "ALL") list = list.eq("status", filters.status);

  const from = (filters.page - 1) * PAGE_SIZE;
  list = list
    .order("created_at", { ascending: false })
    .order("code", { ascending: false }) // stable order for equal timestamps
    .range(from, from + PAGE_SIZE - 1);

  const [listResult, allCount, ...statusCounts] = await Promise.all([
    list,
    base(),
    ...DELIVERY_STATUSES.map((s) => base().eq("status", s)),
  ]);

  if (listResult.error) throw listResult.error;

  const counts = { ALL: allCount.count ?? 0 } as Record<DeliveryStatus | "ALL", number>;
  DELIVERY_STATUSES.forEach((s, i) => {
    counts[s] = statusCounts[i]?.count ?? 0;
  });

  return {
    rows: listResult.data,
    total: listResult.count ?? 0,
    counts,
  };
}

export type DeliveryListRow = Awaited<ReturnType<typeof listDeliveries>>["rows"][number];

export type CourierOption = {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  activeCount: number;
};

/** Couriers with their current load (ASSIGNED + IN_PROGRESS). */
export async function listCouriers(): Promise<CourierOption[]> {
  const supabase = await createClient();
  const [{ data: couriers, error }, { data: active }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, is_active").eq("role", "COURIER").order("full_name"),
    supabase.from("deliveries").select("courier_id").in("status", ["ASSIGNED", "IN_PROGRESS"]),
  ]);
  if (error) throw error;

  const load = new Map<string, number>();
  for (const row of active ?? []) {
    if (row.courier_id) load.set(row.courier_id, (load.get(row.courier_id) ?? 0) + 1);
  }
  return (couriers ?? []).map((c) => ({ ...c, activeCount: load.get(c.id) ?? 0 }));
}

export async function getDeliveryDetail(id: string) {
  const supabase = await createClient();

  const [delivery, history, assignments, payments] = await Promise.all([
    supabase.from("deliveries").select(DETAIL_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("delivery_status_history").select("*").eq("delivery_id", id).order("created_at"),
    supabase.from("delivery_assignments").select("*").eq("delivery_id", id).order("started_at"),
    supabase.from("payment_records").select("*").eq("delivery_id", id).order("recorded_at"),
  ]);

  if (delivery.error) throw delivery.error;
  if (!delivery.data) return null;

  // Resolve every actor referenced in the audit trail to a name.
  const ids = new Set<string>();
  for (const h of history.data ?? []) if (h.changed_by) ids.add(h.changed_by);
  for (const a of assignments.data ?? []) {
    ids.add(a.courier_id);
    for (const v of [a.started_by, a.ended_by, a.previous_courier_id]) if (v) ids.add(v);
  }
  for (const p of payments.data ?? []) {
    ids.add(p.recorded_by);
    if (p.voided_by) ids.add(p.voided_by);
  }
  if (delivery.data.created_by) ids.add(delivery.data.created_by);

  const { data: people } = ids.size
    ? await supabase.from("profiles").select("id, full_name, role").in("id", [...ids])
    : { data: [] };

  return {
    delivery: delivery.data,
    history: history.data ?? [],
    assignments: assignments.data ?? [],
    payments: payments.data ?? [],
    people: Object.fromEntries((people ?? []).map((p) => [p.id, p])) as Record<
      string,
      { id: string; full_name: string; role: "ADMIN" | "COURIER" }
    >,
  };
}

export type DeliveryDetail = NonNullable<Awaited<ReturnType<typeof getDeliveryDetail>>>;
