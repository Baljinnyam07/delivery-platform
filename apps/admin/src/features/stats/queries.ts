import "server-only";

import { addDays, isIsoDate, startOfMonth, todayInUlaanbaatar, ubDayRange } from "@delivery/shared";
import { createClient } from "@/lib/supabase/server";

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export type DateRange = { from: string; to: string };

/** ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive). Defaults to this month so far. */
export function parseDateRange(params: RawParams): DateRange {
  const today = todayInUlaanbaatar();
  let from = first(params.from);
  let to = first(params.to);
  if (!isIsoDate(from)) from = startOfMonth(today);
  if (!isIsoDate(to)) to = today;
  if (to < from) [from, to] = [to, from];
  // RPCs accept at most 366 days.
  if (addDays(from, 366) < to) from = addDays(to, -366);
  return { from, to };
}

export type DashboardStats = {
  created: number;
  delivered: number;
  cancelled: number;
  unassigned_now: number;
  assigned_now: number;
  in_progress_now: number;
  unpaid_count: number;
  unpaid_amount: number;
  collected_cash: number;
  collected_transfer: number;
};

export async function getDashboardStats(range: DateRange): Promise<DashboardStats> {
  const supabase = await createClient();
  const r = ubDayRange(range.from, range.to);
  const { data, error } = await supabase.rpc("get_dashboard_stats", { p_from: r.from, p_to: r.to });
  if (error) throw error;
  const raw = data as Record<string, number | string>;
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Number(v)])) as DashboardStats;
}

export async function getCourierStats(range: DateRange) {
  const supabase = await createClient();
  const r = ubDayRange(range.from, range.to);
  const { data, error } = await supabase.rpc("get_courier_stats", { p_from: r.from, p_to: r.to });
  if (error) throw error;
  return data ?? [];
}

export type CourierStatsRow = Awaited<ReturnType<typeof getCourierStats>>[number];

export async function getDailyReport(range: DateRange) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_daily_report", { p_from: range.from, p_to: range.to });
  if (error) throw error;
  return data ?? [];
}

/** Oldest unassigned deliveries first — they have waited longest. */
export async function getUnassignedQueue(limit = 8) {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("deliveries")
    .select("id, code, customer_name, address, amount_due, scheduled_date, created_at", { count: "exact" })
    .eq("status", "UNASSIGNED")
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function getRecentActivity(limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_status_history")
    .select("id, delivery_id, from_status, to_status, note, created_at, changed_by, delivery:deliveries(code)")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const ids = [...new Set((data ?? []).map((r) => r.changed_by).filter((v): v is string => Boolean(v)))];
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return (data ?? []).map((r) => ({ ...r, actor: r.changed_by ? (names.get(r.changed_by) ?? null) : null }));
}
