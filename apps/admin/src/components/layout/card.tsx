import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { NEON } from "@/lib/neon";
import { tint } from "@/lib/tones";
import { cn } from "@/lib/utils";

/** Section card used across admin pages: dark panel with a title bar. */
export function Card({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl neon-panel", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-4 border-b px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Row of KPI tiles. */
export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 sm:[&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
      {children}
    </div>
  );
}

/**
 * KPI tile: dark panel, thin accent line on top, accent icon chip and a big
 * white tabular number. `accent` is a hex color (status colors).
 */
export function Kpi({
  label,
  value,
  hint,
  accent = NEON.cyan,
  icon: Icon,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: string;
  icon?: LucideIcon;
  href?: string;
}) {
  const body = (
    <>
      <span
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent 80%)` }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-(--dur-base) group-hover/kpi:scale-105"
            style={{ backgroundColor: tint(accent, 14), color: accent }}
            aria-hidden
          >
            <Icon className="size-4" strokeWidth={2.25} />
          </span>
        ) : null}
      </div>
      <p className="tabular mt-1 font-display text-[1.75rem] leading-none font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );
  const className =
    "group/kpi relative block overflow-hidden rounded-xl neon-panel px-5 pt-5 pb-4 transition-[transform,border-color] duration-(--dur-base) ease-(--ease-out)";
  const style = { backgroundImage: `radial-gradient(90% 70% at 100% 0%, ${tint(accent, 8)} 0%, transparent 60%)` };
  return href ? (
    <Link href={href} className={cn(className, "hover:-translate-y-0.5 hover:border-white/15")} style={style}>
      {body}
    </Link>
  ) : (
    <div className={className} style={style}>
      {body}
    </div>
  );
}
