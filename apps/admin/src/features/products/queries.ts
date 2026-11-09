import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ProductRow = {
  id: string;
  factory_id: string;
  name: string;
  unit: string;
  unit_price: number;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
};

export type FactoryWithProducts = {
  id: string;
  name: string;
  is_active: boolean;
  products: ProductRow[];
};

/** All factories with their products (admin catalogue page). */
export async function listFactoriesWithProducts(): Promise<FactoryWithProducts[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("factories")
    .select("id, name, is_active, products(id, factory_id, name, unit, unit_price, stock, low_stock_threshold, is_active)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((f) => ({
    ...f,
    products: [...(f.products ?? [])].sort((a, b) => a.name.localeCompare(b.name, "mn")),
  }));
}

export type PickerProduct = {
  id: string;
  name: string;
  unit: string;
  unit_price: number;
  stock: number;
  factory_id: string;
  factory_name: string;
};

/** Active products of active factories, for the delivery form picker. */
export async function listPickerProducts(): Promise<PickerProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, unit, unit_price, stock, factory_id, factory:factories!inner(name, is_active)")
    .eq("is_active", true)
    .eq("factory.is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    unit_price: Number(p.unit_price),
    stock: p.stock,
    factory_id: p.factory_id,
    factory_name: p.factory?.name ?? "",
  }));
}

/** Latest stock movements (optionally for one product), newest first. */
export async function listStockMovements(limit = 30) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("id, quantity_change, stock_after, reason, note, created_at, product:products(name, unit), delivery:deliveries(id, code)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type StockMovementRow = Awaited<ReturnType<typeof listStockMovements>>[number];
