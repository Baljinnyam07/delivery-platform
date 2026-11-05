"use client";

import { availableActions, DELIVERY_ACTION_LABELS, type DeliveryStatus } from "@delivery/shared";
import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CourierOption } from "../queries";
import { DeliveryActionDialog, type ActionTarget, type DialogAction } from "./delivery-action-dialog";
import { DeliveryFormSheet, type EditableDelivery } from "./delivery-form-sheet";

const DIALOG_ACTIONS: DialogAction[] = ["assign", "reassign", "unassign", "cancel"];

type Props = {
  delivery: EditableDelivery & { status: DeliveryStatus; courier_id: string | null; courierName: string | null };
  couriers: CourierOption[];
};

export function DeliveryDetailActions({ delivery, couriers }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [action, setAction] = useState<DialogAction | null>(null);

  const actions = availableActions({ status: delivery.status, role: "ADMIN", isOwnDelivery: false }).filter(
    (a): a is DialogAction => (DIALOG_ACTIONS as string[]).includes(a),
  );
  const target: ActionTarget = {
    id: delivery.id,
    code: delivery.code,
    courierId: delivery.courier_id,
    courierName: delivery.courierName,
  };
  const editable = delivery.status !== "DELIVERED" && delivery.status !== "CANCELLED";
  const primary = actions.find((a) => a === "assign" || a === "reassign");
  const secondary = actions.filter((a) => a !== primary);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {secondary.map((a) => (
          <Button
            key={a}
            variant="outline"
            className={a === "cancel" ? "text-destructive hover:text-destructive" : undefined}
            onClick={() => setAction(a)}
          >
            {DELIVERY_ACTION_LABELS[a]}
          </Button>
        ))}
        {editable ? (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <PencilIcon />
            Засах
          </Button>
        ) : null}
        {primary ? <Button onClick={() => setAction(primary)}>{DELIVERY_ACTION_LABELS[primary]}</Button> : null}
      </div>

      <DeliveryActionDialog
        action={action}
        delivery={action ? target : null}
        couriers={couriers}
        onOpenChange={(open) => !open && setAction(null)}
      />
      <DeliveryFormSheet open={editOpen} onOpenChange={setEditOpen} delivery={delivery} />
    </>
  );
}
