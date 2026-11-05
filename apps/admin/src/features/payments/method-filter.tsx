"use client";

import { PAYMENT_METHOD_LABELS } from "@delivery/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "__all";

export function MethodFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  return (
    <Select
      value={params.get("method") ?? ALL}
      onValueChange={(v) => {
        const q = new URLSearchParams(params);
        if (v === ALL) q.delete("method");
        else q.set("method", v);
        startTransition(() => router.replace(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false }));
      }}
    >
      <SelectTrigger className="h-9 w-full bg-card sm:w-44" aria-label="Төлбөрийн хэлбэр">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Бүх хэлбэр</SelectItem>
        <SelectItem value="CASH">{PAYMENT_METHOD_LABELS.CASH}</SelectItem>
        <SelectItem value="BANK_TRANSFER">{PAYMENT_METHOD_LABELS.BANK_TRANSFER}</SelectItem>
      </SelectContent>
    </Select>
  );
}
