"use client";

import {
  DELIVERY_STATUSES,
  DELIVERY_STATUS_META,
  PAYMENT_STATUS_META,
  type DeliveryStatus,
} from "@delivery/shared";
import { SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CourierOption } from "../queries";

type Props = {
  counts: Record<DeliveryStatus | "ALL", number>;
  couriers: CourierOption[];
};

const ALL = "__all";
const TABS: (DeliveryStatus | "ALL")[] = ["ALL", ...DELIVERY_STATUSES];

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
        <div role="tablist" aria-label="Төлөвөөр шүүх" className="inline-flex gap-1 rounded-lg border bg-card p-1">
          {TABS.map((tab) => {
            const active = status === tab;
            const label = tab === "ALL" ? "Бүгд" : DELIVERY_STATUS_META[tab].label;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={active}
                onClick={() => update({ status: tab })}
                className={cn(
                  "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab !== "ALL" ? (
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: active ? "currentColor" : DELIVERY_STATUS_META[tab].color }}
                    aria-hidden
                  />
                ) : null}
                {label}
                <span className={cn("tabular text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
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
