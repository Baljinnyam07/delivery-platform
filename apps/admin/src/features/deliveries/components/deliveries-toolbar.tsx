"use client";

import {
  DELIVERY_STATUSES,
  DELIVERY_STATUS_META,
  PAYMENT_STATUS_META,
} from "@delivery/shared";
import { SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tint } from "@/lib/tones";
import { cn } from "@/lib/utils";
import type { CourierOption, DeliveryTab } from "../queries";
import { STATUS_COLOR, STATUS_TEXT } from "./status-badge";

type Props = {
  counts: Record<DeliveryTab, number>;
  couriers: CourierOption[];
};

const ALL = "__all";
const TABS: DeliveryTab[] = ["ALL", ...DELIVERY_STATUSES, "UNPAID"];

export function DeliveriesToolbar({ counts, couriers }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const status = params.get("status") ?? "ALL";
  const courier = params.get("courier") ?? ALL;
  const payment = params.get("payment") ?? ALL;

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "" || value === ALL || (key === "status" && value === "ALL")) next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  }

  // Debounced search
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q.trim() === current) return;
    const t = setTimeout(() => update({ q: q.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = Boolean(params.get("q") || params.get("courier") || params.get("payment"));

  return (
    <div className="space-y-3" data-pending={pending || undefined}>
      {/* Status segments */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div role="tablist" aria-label="Төлөвөөр шүүх" className="inline-flex gap-1 rounded-lg neon-panel p-1">
          {TABS.map((tab) => {
            const active = status === tab;
            const label = tab === "ALL" ? "Бүгд" : tab === "UNPAID" ? "Төлөгдөөгүй" : DELIVERY_STATUS_META[tab].label;
            const color = tab === "ALL" ? null : STATUS_COLOR[tab];
            // Active status tab takes its own hue; "Бүгд" stays ink.
            const activeStyle =
              active && color && tab !== "ALL"
                ? { backgroundColor: tint(color, 14), color: STATUS_TEXT[tab], boxShadow: `inset 0 0 0 1px ${tint(color, 25)}` }
                : undefined;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={active}
                onClick={() => update({ status: tab })}
                style={activeStyle}
                className={cn(
                  "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors duration-(--dur-fast)",
                  active
                    ? color
                      ? ""
                      : "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {color ? <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden /> : null}
                {label}
                <span
                  className={cn(
                    "tabular rounded px-1.5 text-xs",
                    active ? (color ? "bg-black/40" : "text-primary-foreground/80") : "bg-muted text-muted-foreground",
                  )}
                >
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Код, нэр, утас, хаяг…"
            className="h-9 bg-card pl-9"
            aria-label="Хайх"
          />
        </div>

        <Select value={courier} onValueChange={(v) => update({ courier: v })}>
          <SelectTrigger className="h-9 w-full bg-card sm:w-48" aria-label="Курьер">
            <SelectValue placeholder="Курьер" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Бүх курьер</SelectItem>
            {couriers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name}
                {!c.is_active ? " (идэвхгүй)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={payment} onValueChange={(v) => update({ payment: v })}>
          <SelectTrigger className="h-9 w-full bg-card sm:w-44" aria-label="Төлбөр">
            <SelectValue placeholder="Төлбөр" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Бүх төлбөр</SelectItem>
            <SelectItem value="UNPAID">{PAYMENT_STATUS_META.UNPAID.label}</SelectItem>
            <SelectItem value="PAID">{PAYMENT_STATUS_META.PAID.label}</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters ? (
          <Button
            variant="ghost"
            className="h-9 text-muted-foreground"
            onClick={() => {
              setQ("");
              update({ q: null, courier: null, payment: null });
            }}
          >
            <XIcon />
            Цэвэрлэх
          </Button>
        ) : null}
      </div>
    </div>
  );
}
