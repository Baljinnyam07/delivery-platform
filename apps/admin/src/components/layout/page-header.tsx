import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow}
        <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-[-0.01em]">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
