"use client";

import { formatDate, formatMNT } from "@delivery/shared";
import { CheckCircle2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DeliveryActionDialog,
  type ActionTarget,
} from "@/features/deliveries/components/delivery-action-dialog";
import type { CourierOption } from "@/features/deliveries/queries";

type Row = {
  id: string;
  code: string;
  customer_name: string;
  address: string;
  amount_due: number;
  scheduled_date: string | null;
  created_at: string;
};

/** Business rule 5: unassigned deliveries must be visible — and one click away from assignment. */
export function UnassignedQueue({ rows, couriers }: { rows: Row[]; couriers: CourierOption[] }) {
  const [target, setTarget] = useState<ActionTarget | null>(null);

  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
        <CheckCircle2Icon className="size-5 text-status-delivered" />
        Бүх хүргэлт хуваарилагдсан байна.
      </div>
    );
  }

  return (
    <>
      <ul className="-my-2 divide-y">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <Link href={`/deliveries/${r.id}`} className="tabular font-medium hover:text-primary hover:underline">
                  {r.code}
                </Link>
                <span className="truncate text-muted-foreground">{r.customer_name}</span>
              </div>
              <p className="truncate text-sm text-muted-foreground">{r.address}</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="tabular text-sm">{formatMNT(r.amount_due)}</p>
              <p className="tabular text-xs text-muted-foreground">{formatDate(r.scheduled_date ?? r.created_at)}</p>
            </div>
            <Button
              size="sm"
              onClick={() => setTarget({ id: r.id, code: r.code, courierId: null, courierName: null })}
            >
              Хуваарилах
            </Button>
          </li>
        ))}
      </ul>

      <DeliveryActionDialog
        action={target ? "assign" : null}
        delivery={target}
        couriers={couriers}
        onOpenChange={(open) => !open && setTarget(null)}
      />
    </>
  );
}
