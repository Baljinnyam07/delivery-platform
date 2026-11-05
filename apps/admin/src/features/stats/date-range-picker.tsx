"use client";

import { addDays, startOfMonth, todayInUlaanbaatar } from "@delivery/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = { from: string; to: string };

export function DateRangePicker({ from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const today = todayInUlaanbaatar();

  const presets = [
    { label: "Өнөөдөр", from: today, to: today },
    { label: "7 хоног", from: addDays(today, -6), to: today },
    { label: "Энэ сар", from: startOfMonth(today), to: today },
    { label: "30 хоног", from: addDays(today, -29), to: today },
  ];

  function apply(next: { from: string; to: string }) {
    const q = new URLSearchParams(params);
    q.set("from", next.from);
    q.set("to", next.to);
    q.delete("page");
    startTransition(() => router.replace(`${pathname}?${q}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-pending={pending || undefined}>
      <div className="inline-flex rounded-lg border bg-card p-1">
        {presets.map((p) => {
          const active = p.from === from && p.to === to;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => apply(p)}
              className={cn(
                "h-7 rounded-md px-2.5 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={from}
          max={to}
          onChange={(e) => e.target.value && apply({ from: e.target.value, to })}
          className="h-9 w-auto bg-card"
          aria-label="Эхлэх огноо"
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => e.target.value && apply({ from, to: e.target.value })}
          className="h-9 w-auto bg-card"
          aria-label="Дуусах огноо"
        />
      </div>
    </div>
  );
}
