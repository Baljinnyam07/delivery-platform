import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_META, formatDateTime, idSchema, ubDayRange } from "@delivery/shared";
import type { NextRequest } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseDateRange } from "@/features/stats/queries";

const MAX_ROWS = 10000;

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  // Quote everything; neutralize spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * One factory's delivered line items in the range (by delivery time), as CSV
 * (UTF-8 with BOM so Excel shows Cyrillic). ?factory=<id>&from=&to=
 */
export async function GET(request: NextRequest) {
  await getCurrentAdmin();
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const factoryId = idSchema.safeParse(params.factory);
  if (!factoryId.success) return new Response("Unknown factory", { status: 400 });
  const range = parseDateRange(params);
  const r = ubDayRange(range.from, range.to);

  const supabase = await createClient();
  const [{ data: factory }, { data, error }] = await Promise.all([
    supabase.from("factories").select("name").eq("id", factoryId.data).maybeSingle(),
    supabase
      .from("delivery_items")
      .select(
        "product_name, unit, unit_price, quantity, line_total, delivery:deliveries!inner(code, status, delivered_at, customer_name, payment_status, payment_method)",
      )
      .eq("factory_id", factoryId.data)
      .eq("delivery.status", "DELIVERED")
      .gte("delivery.delivered_at", r.from)
      .lt("delivery.delivered_at", r.to)
      .limit(MAX_ROWS),
  ]);
  if (error || !factory) return new Response("Export failed", { status: 500 });

  const rows = [...(data ?? [])].sort((a, b) =>
    (a.delivery?.delivered_at ?? "").localeCompare(b.delivery?.delivered_at ?? ""),
  );

  const header = [
    "Хүргэсэн", "Код", "Харилцагч", "Бараа", "Ширхэг", "Нэгж", "Нэгжийн үнэ (₮)", "Дүн (₮)", "Төлбөр", "Хэлбэр",
  ];
  let qty = 0;
  let amount = 0;
  const lines = rows.map((i) => {
    qty += i.quantity;
    amount += Number(i.line_total ?? 0);
    const d = i.delivery;
    return [
      d?.delivered_at ? formatDateTime(d.delivered_at) : "",
      d?.code,
      d?.customer_name,
      i.product_name,
      i.quantity,
      i.unit,
      Math.round(Number(i.unit_price)),
      Math.round(Number(i.line_total ?? 0)),
      d ? PAYMENT_STATUS_META[d.payment_status].label : "",
      d?.payment_method ? PAYMENT_METHOD_LABELS[d.payment_method] : "",
    ]
      .map(csvCell)
      .join(",");
  });
  const total = ["Нийт", "", "", "", qty, "", "", Math.round(amount), "", ""].map(csvCell).join(",");

  const body = "﻿" + [header.map(csvCell).join(","), ...lines, total].join("\r\n");
  const slug = factory.name.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 40) || "factory";
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${slug}_${range.from}_${range.to}.csv`)}`,
      "Cache-Control": "no-store",
    },
  });
}
