"use client";

import { PackageIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: "unassigned" };

// Only implemented sections are listed. Dashboard, couriers, payments and
// reports are added in Phase 4.
const NAV: NavItem[] = [{ href: "/deliveries", label: "Хүргэлтүүд", icon: PackageIcon, badge: "unassigned" }];

export function Nav({ unassignedCount, onNavigate }: { unassignedCount: number; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">Үндсэн цэс</p>
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-foreground/80 hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            <span className="flex-1">{item.label}</span>
            {item.badge === "unassigned" && unassignedCount > 0 ? (
              <span
                className="tabular rounded-full bg-status-unassigned/15 px-2 py-0.5 text-xs font-semibold text-slate-600"
                title="Хуваарилаагүй хүргэлт"
              >
                {unassignedCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
