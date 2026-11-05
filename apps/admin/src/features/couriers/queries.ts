import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ubDayRange } from "@delivery/shared";
import type { DateRange } from "@/features/stats/queries";

export async function getCourierDetail(id: string, range: DateRange) {
  const supabase = await createClient();
  const r = ubDayRange(range.from, range.to);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, is_active, role, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!profile || profile.role !== "COURIER") return null;

  const [active, finished, payments, auth] = await Promise.all([
    supabase
      .from("deliveries")
      .select("id, code, customer_name, address, status, amount_due, payment_status, assigned_at, started_at")
      .eq("courier_id", id)
      .in("status", ["ASSIGNED", "IN_PROGRESS"])
      .order("assigned_at", { ascending: true }),
    supabase
      .from("deliveries")
      .select("id, code, customer_name, address, status, amount_due, payment_status, delivered_at, cancelled_at")
      .eq("courier_id", id)
      .gte("delivered_at", r.from)
      .lt("delivered_at", r.to)
      .order("delivered_at", { ascending: false })
      .limit(50),
    supabase
      .from("payment_records")
      .select("id, amount, method, recorded_at, voided_at, delivery:deliveries(id, code)")
      .eq("recorded_by", id)
      .gte("recorded_at", r.from)
      .lt("recorded_at", r.to)
      .order("recorded_at", { ascending: false })
      .limit(50),
    // Email lives in auth.users — readable only with the service role.
    createAdminClient().auth.admin.getUserById(id),
  ]);

  return {
    profile,
    email: auth.data.user?.email ?? null,
    active: active.data ?? [],
    finished: finished.data ?? [],
    payments: payments.data ?? [],
  };
}
