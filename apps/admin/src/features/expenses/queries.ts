import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DateRange } from "@/features/stats/queries";

/** Active expenses in the range (by spent_on), newest first, with their per-brand split. */
export async function listExpenses(range: DateRange) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, spent_on, amount, description, factory_id, created_at, factory:factories!expenses_factory_id_fkey(name), allocations:expense_allocations(factory_id, amount)",
    )
    .is("voided_at", null)
    .gte("spent_on", range.from)
    .lte("spent_on", range.to)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []).map((e) => ({
    ...e,
    amount: Number(e.amount),
    allocations: e.allocations.map((a) => ({ factoryId: a.factory_id, amount: Number(a.amount) })),
  }));

  const byFactory = new Map<string, number>();
  for (const e of rows) {
    for (const a of e.allocations) byFactory.set(a.factoryId, (byFactory.get(a.factoryId) ?? 0) + a.amount);
  }
  return { rows, byFactory, total: rows.reduce((s, e) => s + e.amount, 0) };
}

export type ExpenseRow = Awaited<ReturnType<typeof listExpenses>>["rows"][number];

/** Brands an expense can be booked to. */
export async function listExpenseFactories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("factories")
    .select("id, name")
    .eq("is_active", true)
    .order("created_at")
    .order("name");
  if (error) throw error;
  return data ?? [];
}
