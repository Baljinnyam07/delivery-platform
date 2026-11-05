import {
  DELIVERY_STATUS_META,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_META,
  formatDateTime,
  ubDayRange,
} from "@delivery/shared";
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

/** Deliveries created in the range, as CSV (UTF-8 with BOM so Excel shows Cyrillic). */
export async function GET(request: NextRequest) {
  await getCurrentAdmin();
  const range = parseDateRange(Object.fromEntries(request.nextUrl.searchParams));
  const r = ubDayRange(range.from, range.to);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deliveries")
    .select(
      "code, created_at, customer_name, customer_phone, address, package_description, status, amount_due, payment_status, payment_method, delivered_at, cancel_reason, courier:profiles!deliveries_courier_id_fkey(full_name)",
    )
    .gte("created_at", r.from)
    .lt("created_at", r.to)
    .order("created_at")
    .limit(MAX_ROWS);
  if (error) return new Response("Export failed", { status: 500 });

  const header = [
    "Код", "Бүртгэсэн", "Харилцагч", "Утас", "Хаяг", "Илгээмж", "Төлөв", "Курьер",
    "Дүн (₮)", "Төлбөр", "Төлбөрийн хэлбэр", "Хүргэсэн", "Цуцалсан шалтгаан",
  ];
  const lines = (data ?? []).map((d) =>
    [
      d.code,
      formatDateTime(d.created_at),
      d.customer_name,
      d.customer_phone,
      d.address,
      d.package_description,
      DELIVERY_STATUS_META[d.status].label,
      d.courier?.full_name,
      Math.round(Number(d.amount_due)),
      PAYMENT_STATUS_META[d.payment_status].label,
      d.payment_method ? PAYMENT_METHOD_LABELS[d.payment_method] : "",
      d.delivered_at ? formatDateTime(d.delivered_at) : "",
      d.cancel_reason,
    ]
      .map(csvCell)
      .join(","),
  );

  const body = "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="deliveries_${range.from}_${range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
