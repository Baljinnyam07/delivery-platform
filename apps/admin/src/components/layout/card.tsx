import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Section card used across admin pages: title bar + body. */
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
    <section className={cn("rounded-xl border bg-card shadow-xs", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-4 border-b px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{title}</h2>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** KPI strip in the style of the approved dashboard reference: cells split by thin dividers. */
export function KpiStrip({ children }: { children: ReactNode }) {
  return (
    // gap-px over a border-colored background draws clean dividers for any column count.
    <div className="grid gap-px overflow-hidden rounded-xl border bg-border shadow-xs sm:grid-cols-2 lg:grid-cols-5 [&>*]:bg-card sm:[&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
      {children}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  accent,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {accent ? <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden /> : null}
        {label}
      </p>
      <p className="tabular mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="block px-5 py-4 transition-colors hover:bg-muted/50">
      {body}
    </Link>
  ) : (
    <div className="px-5 py-4">{body}</div>
  );
}
