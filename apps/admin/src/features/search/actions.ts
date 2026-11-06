"use server";

import type { DeliveryStatus } from "@delivery/shared";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { searchFilter } from "@/features/deliveries/queries";

export type SearchResults = {
  deliveries: {
    id: string;
    code: string;
    customer_name: string;
    customer_phone: string;
    address: string;
    status: DeliveryStatus;
  }[];
  couriers: { id: string; full_name: string; phone: string | null; is_active: boolean }[];
};

/** Command palette search: deliveries by code/name/phone/address, couriers by name/phone. */
export async function searchEverything(q: string): Promise<SearchResults> {
  await getCurrentAdmin();
  const query = String(q ?? "").slice(0, 100);
  const deliveryFilter = searchFilter(query);
  if (!deliveryFilter) return { deliveries: [], couriers: [] };

  const term = query.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim();
  const supabase = await createClient();

  const [deliveries, couriers] = await Promise.all([
    supabase
      .from("deliveries")
      .select("id, code, customer_name, customer_phone, address, status")
      .or(deliveryFilter)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("profiles")
      .select("id, full_name, phone, is_active")
      .eq("role", "COURIER")
      .or(`full_name.ilike.%${term}%,phone.ilike.%${term.replace(/[\s-]/g, "")}%`)
      .order("full_name")
      .limit(4),
  ]);

  return { deliveries: deliveries.data ?? [], couriers: couriers.data ?? [] };
}
