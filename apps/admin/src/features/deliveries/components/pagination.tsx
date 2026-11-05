import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  params: Record<string, string | string[] | undefined>;
};

function hrefFor(params: Props["params"], page: number) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === "page" || v === undefined) continue;
    next.set(k, Array.isArray(v) ? (v[0] ?? "") : v);
  }
  if (page > 1) next.set("page", String(page));
  const qs = next.toString();
  return `/deliveries${qs ? `?${qs}` : ""}`;
}

export function Pagination({ page, pageSize, total, params }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between gap-4 border-t px-4 py-3 text-sm">
      <p className="tabular text-muted-foreground">
        {total === 0 ? "0" : `${from}–${to}`} / {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={hrefFor(params, page - 1)} scroll={false}>
              <ChevronLeftIcon />
              Өмнөх
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeftIcon />
            Өмнөх
          </Button>
        )}
        <span className="tabular px-1 text-muted-foreground">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={hrefFor(params, page + 1)} scroll={false}>
              Дараах
              <ChevronRightIcon />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Дараах
            <ChevronRightIcon />
          </Button>
        )}
      </div>
    </div>
  );
}
