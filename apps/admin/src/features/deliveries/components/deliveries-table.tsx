"use client";

import {
  availableActions,
  DELIVERY_ACTION_LABELS,
  formatDate,
  formatMNT,
  formatPhone,
} from "@delivery/shared";
import { InboxIcon, MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { AvatarInitial } from "@/components/ui/avatar-initial";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CourierOption, DeliveryListRow } from "../queries";
import { DeliveryActionDialog, type ActionTarget, type DialogAction } from "./delivery-action-dialog";
import { PaymentStatusBadge, DeliveryStatusBadge, STATUS_COLOR } from "./status-badge";

const DIALOG_ACTIONS: DialogAction[] = ["assign", "reassign", "unassign", "cancel"];

export function DeliveriesTable({ rows, couriers }: { rows: DeliveryListRow[]; couriers: CourierOption[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ action: DialogAction; target: ActionTarget } | null>(null);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-neon-cyan/10 text-neon-cyan">
          <InboxIcon className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">Хүргэлт олдсонгүй</p>
          <p className="text-sm text-muted-foreground">Шүүлтүүрээ өөрчилж эсвэл шинэ хүргэлт үүсгэнэ үү.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-28 pl-4">Код</TableHead>
            <TableHead>Харилцагч</TableHead>
            <TableHead className="min-w-56">Хаяг</TableHead>
            <TableHead>Курьер</TableHead>
            <TableHead>Төлөв</TableHead>
            <TableHead>Төлбөр</TableHead>
            <TableHead className="text-right">Дүн</TableHead>
            <TableHead>Огноо</TableHead>
            <TableHead className="w-12 pr-4">
              <span className="sr-only">Үйлдэл</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const actions = availableActions({ status: row.status, role: "ADMIN", isOwnDelivery: false }).filter(
              (a): a is DialogAction => (DIALOG_ACTIONS as string[]).includes(a),
            );
            const target: ActionTarget = {
              id: row.id,
              code: row.code,
              courierId: row.courier_id,
              courierName: row.courier?.full_name ?? null,
            };
            const href = `/deliveries/${row.id}`;
            return (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                style={{ "--row-tone": STATUS_COLOR[row.status] } as CSSProperties}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a,button,[role=menuitem]")) return;
                  router.push(href);
                }}
              >
                <TableCell className="pl-4 font-medium shadow-[inset_3px_0_0_var(--row-tone)]">
                  <Link href={href} className="tabular hover:text-link hover:underline">
                    {row.code}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{row.customer_name}</div>
                  <div className="tabular text-xs text-muted-foreground">{formatPhone(row.customer_phone)}</div>
                </TableCell>
                <TableCell className="max-w-72">
                  <div className="truncate" title={row.address}>
                    {row.address}
                  </div>
                  {row.address_note ? (
                    <div className="truncate text-xs text-muted-foreground">{row.address_note}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  {row.courier ? (
                    <span className="flex items-center gap-2">
                      <AvatarInitial name={row.courier.full_name} seed={row.courier.id} className="size-6 text-[10px] ring-0" />
                      {row.courier.full_name}
                    </span>
                  ) : (
                    <span className="text-subtle-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <DeliveryStatusBadge status={row.status} />
                </TableCell>
                <TableCell>
                  {row.amount_due > 0 ? (
                    <PaymentStatusBadge status={row.payment_status} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Төлбөргүй</span>
                  )}
                </TableCell>
                <TableCell
                  className={cn(
                    "tabular text-right font-medium",
                    row.amount_due === 0
                      ? "text-subtle-foreground"
                      : row.payment_status === "PAID"
                        ? "text-neon-green"
                        : "text-foreground",
                  )}
                >
                  {formatMNT(row.amount_due)}
                </TableCell>
                <TableCell className="tabular text-muted-foreground">
                  {formatDate(row.scheduled_date ?? row.created_at)}
                </TableCell>
                <TableCell className="pr-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" aria-label={`${row.code} үйлдэл`}>
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem asChild>
                        <Link href={href}>Дэлгэрэнгүй</Link>
                      </DropdownMenuItem>
                      {actions.length ? <DropdownMenuSeparator /> : null}
                      {actions.map((action) => (
                        <DropdownMenuItem
                          key={action}
                          variant={action === "cancel" ? "destructive" : "default"}
                          onSelect={() => setDialog({ action, target })}
                        >
                          {DELIVERY_ACTION_LABELS[action]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <DeliveryActionDialog
        action={dialog?.action ?? null}
        delivery={dialog?.target ?? null}
        couriers={couriers}
        onOpenChange={(open) => !open && setDialog(null)}
      />
    </>
  );
}
