"use client";

import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, formatMNT, type PaymentMethod } from "@delivery/shared";
import { BanknoteIcon, Loader2Icon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { recordPayment, voidPayment } from "./actions";

// ---------------- Record ----------------

function RecordForm({ delivery, onClose }: { delivery: { id: string; code: string; amount_due: number }; onClose: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await recordPayment({ deliveryId: delivery.id, method, amount: delivery.amount_due, note });
      if (result.ok) {
        toast.success("Төлбөр бүртгэгдлээ.");
        onClose();
      } else toast.error(result.error);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Төлбөр бүртгэх</DialogTitle>
        <DialogDescription>{delivery.code} — нэг удаагийн бүтэн төлбөр. Хүргэлтийн төлөв өөрчлөгдөхгүй.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="rounded-lg bg-muted/60 px-4 py-3">
          <p className="text-xs text-muted-foreground">Төлөх дүн</p>
          <p className="tabular text-2xl font-semibold">{formatMNT(delivery.amount_due)}</p>
        </div>
        <div className="space-y-2">
          <Label>Төлбөрийн хэлбэр</Label>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => setMethod(m)}
                className={cn(
                  "h-10 rounded-lg border text-sm font-medium transition-colors",
                  method === m ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted",
                )}
              >
                {PAYMENT_METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pay-note">Тэмдэглэл (заавал биш)</Label>
          <Textarea id="pay-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Болих
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Бүртгэх
        </Button>
      </DialogFooter>
    </>
  );
}

export function RecordPaymentButton({ delivery }: { delivery: { id: string; code: string; amount_due: number } }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <BanknoteIcon />
        Төлбөр бүртгэх
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">{open ? <RecordForm delivery={delivery} onClose={() => setOpen(false)} /> : null}</DialogContent>
      </Dialog>
    </>
  );
}

// ---------------- Void ----------------

function VoidForm({ payment, onClose }: { payment: { id: string; amount: number; code?: string }; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!reason.trim()) return setError("Шалтгаанаа заавал оруулна уу.");
    startTransition(async () => {
      const result = await voidPayment({ paymentId: payment.id, reason });
      if (result.ok) {
        toast.success("Төлбөр хүчингүй боллоо.");
        onClose();
      } else {
        setError(result.fieldErrors?.reason);
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Төлбөр хүчингүй болгох</DialogTitle>
        <DialogDescription>
          {payment.code ? `${payment.code} · ` : ""}
          {formatMNT(payment.amount)} төлбөр хүчингүй болж, хүргэлт “Төлөгдөөгүй” төлөвт орно. Бүртгэл устахгүй, түүхэнд үлдэнэ.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="void-reason">Шалтгаан</Label>
        <Textarea
          id="void-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Жишээ нь: Төлбөрийн хэлбэрийг буруу бүртгэсэн"
          aria-invalid={Boolean(error)}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Болих
        </Button>
        <Button variant="destructive" onClick={submit} disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Хүчингүй болгох
        </Button>
      </DialogFooter>
    </>
  );
}

export function VoidPaymentButton({
  payment,
  size = "sm",
}: {
  payment: { id: string; amount: number; code?: string };
  size?: "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className={cn("text-destructive hover:text-destructive", size === "xs" && "h-7 px-2 text-xs")}
        onClick={() => setOpen(true)}
      >
        Хүчингүй болгох
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">{open ? <VoidForm payment={payment} onClose={() => setOpen(false)} /> : null}</DialogContent>
      </Dialog>
    </>
  );
}
