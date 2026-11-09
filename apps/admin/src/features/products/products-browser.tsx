"use client";

import { formatDate, formatMNT, formatTime } from "@delivery/shared";
import { FactoryIcon, HistoryIcon, PackageIcon, SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { NEON } from "@/lib/neon";
import { tint } from "@/lib/tones";
import { cn } from "@/lib/utils";
import { FactoryDialogButton, ProductDialogButton, StockDialogButton } from "./product-dialogs";
import type { FactoryWithProducts, ProductRow, StockMovementRow } from "./queries";

const REASON_LABEL = {
  RESTOCK: "Нөөц нэмсэн",
  ADJUSTMENT: "Тооллогын засвар",
  DELIVERY: "Хүргэлтэд гарсан",
  CANCELLED: "Цуцлалтаар буцсан",
} as const;

type StockFilter = "all" | "low" | "out";
type View = "products" | "movements";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const isLow = (p: ProductRow) => p.stock > 0 && p.stock <= p.low_stock_threshold;
const value = (ps: ProductRow[]) => ps.filter((p) => p.is_active).reduce((s, p) => s + p.stock * Number(p.unit_price), 0);

function StockPill({ product }: { product: ProductRow }) {
  const color = product.stock === 0 ? NEON.red : isLow(product) ? NEON.yellow : NEON.green;
  return (
    <span
      className="tabular inline-flex min-w-14 items-center justify-center gap-1 rounded-md px-2 py-0.5 text-[13px] font-semibold"
      style={{ backgroundColor: tint(color, 14), color }}
      title={product.stock === 0 ? "Дууссан" : isLow(product) ? "Нөөц бага" : undefined}
    >
      {product.stock}
      <span className="text-[11px] font-normal opacity-80">{product.unit}</span>
    </span>
  );
}

/**
 * Catalogue as master–detail: factories on the left, one filterable product
 * table on the right (scrolls inside its own box), stock history as a tab.
 */
export function ProductsBrowser({
  factories,
  movements,
}: {
  factories: FactoryWithProducts[];
  movements: StockMovementRow[];
}) {
  const [factoryId, setFactoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [view, setView] = useState<View>("products");

  const factory = factories.find((f) => f.id === factoryId) ?? null;
  const factoryById = useMemo(() => new Map(factories.map((f) => [f.id, f])), [factories]);
  const all = useMemo(() => factories.flatMap((f) => f.products), [factories]);
  const scoped = factory ? factory.products : all;

  const counts = {
    all: scoped.length,
    low: scoped.filter((p) => p.is_active && isLow(p)).length,
    out: scoped.filter((p) => p.is_active && p.stock === 0).length,
  };

  const rows = useMemo(() => {
    const q = norm(query);
    return scoped.filter((p) => {
      if (stockFilter === "low" && !(p.is_active && isLow(p))) return false;
      if (stockFilter === "out" && !(p.is_active && p.stock === 0)) return false;
      if (!q) return true;
      return norm(p.name).includes(q) || (!factory && norm(factoryById.get(p.factory_id)?.name ?? "").includes(q));
    });
  }, [scoped, query, stockFilter, factory, factoryById]);

  const active = all.filter((p) => p.is_active);
  const lowTotal = active.filter((p) => p.stock <= p.low_stock_threshold).length;

  return (
    <div className="space-y-4">
      {/* Compact totals */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {[
          ["Үйлдвэр", factories.length, undefined],
          ["Идэвхтэй бараа", active.length, undefined],
          ["Нөөцийн үнэлгээ", formatMNT(value(all)), undefined],
          ["Нөөц бага / дууссан", lowTotal, lowTotal ? NEON.yellow : NEON.green],
        ].map(([label, v, color]) => (
          <div key={String(label)} className="bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="tabular mt-0.5 font-display text-xl font-bold" style={color ? { color: String(color) } : undefined}>
              {v}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* Factories: chips on mobile, sticky list on desktop */}
        <nav aria-label="Үйлдвэр" className="min-w-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)] lg:flex-col lg:gap-0.5 lg:overflow-y-auto lg:rounded-xl lg:border lg:bg-card lg:p-1.5">
            <FactoryItem
              label="Бүх үйлдвэр"
              count={all.length}
              selected={!factoryId}
              onClick={() => setFactoryId(null)}
            />
            {factories.map((f) => (
              <FactoryItem
                key={f.id}
                label={f.code_letter ? `${f.name} · ${f.code_letter}` : f.name}
                count={f.products.length}
                warn={f.products.some((p) => p.is_active && p.stock <= p.low_stock_threshold)}
                muted={!f.is_active}
                selected={f.id === factoryId}
                onClick={() => setFactoryId(f.id)}
              />
            ))}
          </div>
        </nav>

        <section className="min-w-0 overflow-hidden rounded-xl neon-panel">
          {/* Header: selected factory + actions */}
          <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 truncate text-sm font-semibold">
                <FactoryIcon className="size-4 shrink-0 text-neon-violet" />
                <span className="truncate">{factory ? factory.name : "Бүх үйлдвэр"}</span>
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {scoped.length} бараа · нөөцийн үнэлгээ {formatMNT(value(scoped))}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {factory ? (
                <>
                  <FactoryDialogButton factory={factory} />
                  <ProductDialogButton factory={factory} />
                </>
              ) : (
                <span className="hidden text-xs text-muted-foreground sm:inline">Бараа нэмэхдээ үйлдвэр сонгоно</span>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  ["products", "Бараа", PackageIcon],
                  ["movements", "Хөдөлгөөн", HistoryIcon],
                ] as const
              ).map(([v, label, Icon]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                    view === v ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {view === "products" ? (
              <>
                <div className="relative min-w-40 flex-1">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Бараа хайх…"
                    aria-label="Бараа хайх"
                    className="h-9 pr-8 pl-8"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
                      aria-label="Хайлт цэвэрлэх"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  {(
                    [
                      ["all", "Бүгд", counts.all, undefined],
                      ["low", "Бага", counts.low, NEON.yellow],
                      ["out", "Дууссан", counts.out, NEON.red],
                    ] as const
                  ).map(([v, label, n, color]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setStockFilter(v)}
                      className={cn(
                        "flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                        stockFilter === v
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {color ? <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} /> : null}
                      {label}
                      <span className="tabular opacity-70">{n}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {view === "products" ? (
            <div className="max-h-[calc(100dvh-17rem)] min-h-64 overflow-auto">
              {rows.length === 0 ? (
                <EmptyRows factory={factory} hasProducts={scoped.length > 0} />
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground shadow-[0_1px_0_var(--border)]">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Бараа</th>
                      <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Үнэ</th>
                      <th className="px-3 py-2 text-right font-medium">Нөөц</th>
                      <th className="hidden px-3 py-2 text-right font-medium md:table-cell">Үнэлгээ</th>
                      <th className="py-2 pr-4 pl-2">
                        <span className="sr-only">Үйлдэл</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {rows.map((p) => {
                      const f = factoryById.get(p.factory_id)!;
                      return (
                        <tr key={p.id} className={cn("hover:bg-white/[0.02]", !p.is_active && "opacity-50")}>
                          <td className="w-full max-w-0 px-4 py-2">
                            <p className="truncate font-medium">{p.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              <span className="tabular sm:hidden">{formatMNT(Number(p.unit_price))}</span>
                              {factory ? null : (
                                <>
                                  <span className="sm:hidden"> · </span>
                                  {f.name}
                                </>
                              )}
                              {p.is_active ? null : " · Идэвхгүй"}
                            </p>
                          </td>
                          <td className="tabular hidden px-3 py-2 text-right whitespace-nowrap sm:table-cell">
                            {formatMNT(Number(p.unit_price))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <StockPill product={p} />
                          </td>
                          <td className="tabular hidden px-3 py-2 text-right whitespace-nowrap text-muted-foreground md:table-cell">
                            {formatMNT(p.stock * Number(p.unit_price))}
                          </td>
                          <td className="py-2 pr-4 pl-2">
                            <div className="flex items-center justify-end gap-1">
                              <StockDialogButton product={p} />
                              <ProductDialogButton factory={f} product={p} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <Movements movements={movements} />
          )}
        </section>
      </div>
    </div>
  );
}

function FactoryItem({
  label,
  count,
  selected,
  warn,
  muted,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  warn?: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected || undefined}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-left text-sm whitespace-nowrap transition-colors lg:w-full lg:rounded-lg lg:border-transparent lg:px-2.5",
        selected
          ? "border-primary/60 bg-primary/10 font-medium text-foreground lg:border-transparent lg:bg-primary/12"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
        muted && "opacity-50",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {warn ? <span className="size-1.5 shrink-0 rounded-full bg-neon-yellow" title="Нөөц бага бараа бий" /> : null}
      <span className="tabular shrink-0 text-xs opacity-70">{count}</span>
    </button>
  );
}

function EmptyRows({ factory, hasProducts }: { factory: FactoryWithProducts | null; hasProducts: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-neon-cyan/10 text-neon-cyan">
        <PackageIcon className="size-5" />
      </span>
      <p className="text-sm text-muted-foreground">
        {hasProducts ? "Шүүлтэд тохирох бараа алга." : "Энэ үйлдвэрт бараа алга."}
      </p>
      {factory && !hasProducts ? <ProductDialogButton factory={factory} /> : null}
    </div>
  );
}

function Movements({ movements }: { movements: StockMovementRow[] }) {
  if (movements.length === 0) {
    return <p className="px-4 py-14 text-center text-sm text-muted-foreground">Нөөцийн хөдөлгөөн алга.</p>;
  }
  return (
    <ul className="max-h-[calc(100dvh-17rem)] min-h-64 divide-y divide-white/[0.05] overflow-auto">
      {movements.map((m) => (
        <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <span
            className={cn(
              "tabular w-12 shrink-0 text-right font-semibold",
              m.quantity_change > 0 ? "text-neon-green" : "text-[#ff8ba7]",
            )}
          >
            {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{m.product?.name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {REASON_LABEL[m.reason]}
              {m.delivery ? (
                <>
                  {" · "}
                  <Link href={`/deliveries/${m.delivery.id}`} className="tabular text-link hover:underline">
                    {m.delivery.code}
                  </Link>
                </>
              ) : null}
              {m.note ? ` · “${m.note}”` : null}
            </span>
          </span>
          <span className="shrink-0 text-right text-xs text-muted-foreground">
            <span className="tabular block">
              {m.stock_after} {m.product?.unit}
            </span>
            <span className="tabular block">
              {formatDate(m.created_at)} {formatTime(m.created_at)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
