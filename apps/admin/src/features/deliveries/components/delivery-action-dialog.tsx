"use client";

import { DELIVERY_ACTION_LABELS } from "@delivery/shared";
import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  assignDelivery,
  cancelDelivery,
  reassignDelivery,
  unassignDelivery,
  type ActionResult,
} from "../actions";
import type { CourierOption } from "../queries";

export type DialogAction = "assign" | "reassign" | "unassign" | "cancel";

export type ActionTarget = {
  id: string;
  code: string;
  courierId: string | null;
  courierName: string | null;
};

type Props = {
  action: DialogAction | null;
  delivery: ActionTarget | null;
  couriers: CourierOption[];
  onOpenChange: (open: boolean) => void;
};

const COPY: Record<DialogAction, { description: (d: ActionTarget) => string; submit: string; success: string }> = {
  assign: {
    description: (d) => `${d.code} хүргэлтийг курьерт хуваарилна.`,
    submit: "Хуваарилах",
    success: "Хүргэлт хуваарилагдлаа.",
  },
  reassign: {
    description: (d) =>
      `${d.code} хүргэлтийг ${d.courierName ?? "одоогийн курьер"}-аас өөр курьерт шилжүүлнэ. Шалтгаан түүхэнд хадгалагдана.`,
    submit: "Шилжүүлэх",
    success: "Хүргэлт дахин хуваарилагдлаа.",
  },
  unassign: {
    description: (d) => `${d.code} хүргэлт ${d.courierName ?? "курьер"}-аас хасагдаж, хуваарилаагүй төлөвт шилжинэ.`,
    submit: "Хасах",
    success: "Хүргэлт хуваарилалтаас хасагдлаа.",
  },
  cancel: {
    description: (d) => `${d.code} хүргэлтийг цуцална. Энэ үйлдлийг буцаах боломжгүй.`,
    submit: "Цуцлах",
    success: "Хүргэлт цуцлагдлаа.",
  },
};

export function DeliveryActionDialog({ action, delivery, couriers, onOpenChange }: Props) {
  const [busy, setBusy] = useState(false);
  const open = Boolean(action && delivery);

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        {/* Content unmounts on close, so each open starts with an empty form. */}
        {action && delivery ? (
          <ActionForm
            key={`${action}-${delivery.id}`}
            action={action}
            delivery={delivery}
            couriers={couriers}
            onClose={() => onOpenChange(false)}
            onBusyChange={setBusy}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ActionForm({
  action,
  delivery,
  couriers,
  onClose,
  onBusyChange,
}: {
  action: DialogAction;
  delivery: ActionTarget;
  couriers: CourierOption[];
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [courierId, setCourierId] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const needsCourier = action === "assign" || action === "reassign";
  const needsReason = action !== "assign";
  const copy = COPY[action];
  const options = couriers.filter((c) => c.is_active && c.id !== delivery.courierId);

  function submit() {
    const nextErrors: Record<string, string> = {};
    if (needsCourier && !courierId) nextErrors.courierId = "Курьер сонгоно уу.";
    if (needsReason && !reason.trim()) nextErrors.reason = "Шалтгаанаа заавал оруулна уу.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    onBusyChange(true);
    startTransition(async () => {
      const deliveryId = delivery.id;
      let result: ActionResult;
      if (action === "assign") result = await assignDelivery({ deliveryId, courierId });
      else if (action === "reassign") result = await reassignDelivery({ deliveryId, courierId, reason });
      else if (action === "unassign") result = await unassignDelivery({ deliveryId, reason });
      else result = await cancelDelivery({ deliveryId, reason });
      onBusyChange(false);

      if (result.ok) {
        toast.success(copy.success);
        onClose();
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{DELIVERY_ACTION_LABELS[action]}</DialogTitle>
        <DialogDescription>{copy.description(delivery)}</DialogDescription>
      </DialogHeader>

      <form
        id="delivery-action-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {needsCourier ? (
          <div className="space-y-2">
            <Label htmlFor="courier">Курьер</Label>
            <Select value={courierId} onValueChange={setCourierId}>
              <SelectTrigger id="courier" className="w-full" aria-invalid={Boolean(errors.courierId)}>
                <SelectValue placeholder="Курьер сонгох" />
              </SelectTrigger>
              <SelectContent>
                {options.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground">Идэвхтэй курьер алга.</div>
                ) : (
                  options.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span>{c.full_name}</span>
                      <span className="tabular text-muted-foreground">
                        {c.activeCount > 0 ? `· ${c.activeCount} идэвхтэй` : "· чөлөөтэй"}
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.courierId ? <p className="text-sm text-destructive">{errors.courierId}</p> : null}
          </div>
        ) : null}

        {needsReason ? (
          <div className="space-y-2">
            <Label htmlFor="reason">Шалтгаан</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Жишээ нь: Харилцагч хүргэлтийн хаягаа өөрчилсөн"
              aria-invalid={Boolean(errors.reason)}
            />
            {errors.reason ? <p className="text-sm text-destructive">{errors.reason}</p> : null}
          </div>
        ) : null}
      </form>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Болих
        </Button>
        <Button
          type="submit"
          form="delivery-action-form"
          variant={action === "cancel" ? "destructive" : "default"}
          disabled={pending}
        >
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          {copy.submit}
        </Button>
      </DialogFooter>
    </>
  );
}
