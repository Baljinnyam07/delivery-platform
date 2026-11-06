"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, isActive } from "./nav-config";

export function Nav({
  unassignedCount,
  collapsed = false,
  onNavigate,
}: {
  unassignedCount: number;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="space-y-0.5">
          <p
            className={cn(
              "px-3 pb-1.5 text-[11px] font-medium tracking-wide text-subtle-foreground uppercase transition-opacity",
              collapsed && "sr-only",
            )}
          >
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            const count = item.badge === "unassigned" ? unassignedCount : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group/nav relative flex h-9 items-center gap-3 rounded-lg text-[13.5px] font-medium transition-colors duration-(--dur-fast)",
                  collapsed ? "justify-center px-0" : "px-3",
                  active
                    ? "bg-white/[0.06] text-foreground"
                    : "text-foreground/65 hover:bg-white/[0.04] hover:text-foreground",
                )}
              >
                {active ? (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-neon-cyan shadow-[0_0_8px_var(--neon-cyan)]" aria-hidden />
                ) : null}
                <Icon className={cn("size-4 shrink-0", active ? "text-neon-cyan" : "text-foreground/45 group-hover/nav:text-foreground/80")} />
                {collapsed ? (
                  count > 0 ? (
                    <span className="absolute top-1.5 right-2.5 size-1.5 rounded-full bg-neon-violet" aria-hidden />
                  ) : null
                ) : (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {count > 0 ? (
                      <span
                        className="tabular rounded-md bg-neon-violet/15 px-1.5 py-0.5 text-[11px] font-semibold text-[#D69BFF] group-hover/nav:hidden"
                        title="Хуваарилаагүй хүргэлт"
                      >
                        {count}
                      </span>
                    ) : null}
                    <span className="hidden items-center gap-0.5 group-hover/nav:flex" aria-hidden>
                      <kbd className="kbd">G</kbd>
                      <kbd className="kbd">{item.key.toUpperCase()}</kbd>
                    </span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
