"use client";

import { deliveryCreateSchema, deliveryUpdateSchema, todayInUlaanbaatar } from "@delivery/shared";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { createDelivery, updateDelivery } from "../actions";

type FormValues = {
  customer_name: string;
  customer_phone: string;
  address: string;
  address_note: string;
  package_description: string;
  amount_due: string;
  scheduled_date: string;
  notes: string;
};

export type EditableDelivery = {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  address_note: string | null;
  package_description: string | null;
  amount_due: number;
  scheduled_date: string | null;
  notes: string | null;
  payment_status: "PAID" | "UNPAID";
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to create a new delivery. */
  delivery?: EditableDelivery;
};

function initialValues(d?: EditableDelivery): FormValues {
  return {
    customer_name: d?.customer_name ?? "",
    customer_phone: d?.customer_phone ?? "",
    address: d?.address ?? "",
    address_note: d?.address_note ?? "",
    package_description: d?.package_description ?? "",
    amount_due: d ? String(Math.round(d.amount_due)) : "",
    scheduled_date: d ? (d.scheduled_date ?? "") : todayInUlaanbaatar(),
    notes: d?.notes ?? "",
  };
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function DeliveryFormSheet({ open, onOpenChange, delivery }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {/* Content unmounts on close, so every open starts with fresh state. */}
        <DeliveryForm delivery={delivery} onClose={() => onOpenChange(false)} onBusyChange={setBusy} />
      </SheetContent>
    </Sheet>
  );
}

function DeliveryForm({
  delivery,
  onClose,
  onBusyChange,
}: {
  delivery?: EditableDelivery;
  onClose: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(delivery);
  // Snapshot on open: a realtime refresh must not overwrite what the admin is typing.
  const [values, setValues] = useState<FormValues>(() => initialValues(delivery));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  // One id per opened form → a double submit cannot create two deliveries.
  const [createId] = useState(() => crypto.randomUUID());

  const set = (key: keyof FormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const amountLocked = delivery?.payment_status === "PAID";

  function submit() {
    const payload = {
      ...values,
      amount_due: values.amount_due.replace(/\D/g, "") || "0",
    };
    const schema = isEdit ? deliveryUpdateSchema : deliveryCreateSchema;
    const parsed = schema.safeParse(isEdit ? payload : { ...payload, id: createId });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});

    onBusyChange(true);
    startTransition(async () => {
      const input: Record<string, unknown> = { ...payload };
      if (amountLocked) delete input.amount_due;
      const result = isEdit
        ? await updateDelivery(delivery!.id, input)
        : await createDelivery({ ...input, id: createId });

      onBusyChange(false);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Хадгалагдлаа." : "Хүргэлт үүслээ.");
      onClose();
      router.refresh();
    });
  }

  return (
    <>
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>{isEdit ? `${delivery!.code} засах` : "Шинэ хүргэлт"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Хүргэлтийн мэдээллийг шинэчилнэ." : "Хүргэлт үүсмэгц хуваарилаагүй төлөвт орно."}
          </SheetDescription>
        </SheetHeader>

        <form
          id="delivery-form"
          className="flex-1 space-y-6 overflow-y-auto px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Харилцагч</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="customer_name" label="Нэр" error={errors.customer_name}>
                <Input id="customer_name" value={values.customer_name} onChange={set("customer_name")} autoFocus={!isEdit} aria-invalid={Boolean(errors.customer_name)} />
              </Field>
              <Field id="customer_phone" label="Утас" error={errors.customer_phone}>
                <Input id="customer_phone" value={values.customer_phone} onChange={set("customer_phone")} inputMode="tel" placeholder="9911 2233" aria-invalid={Boolean(errors.customer_phone)} />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Хаяг</h3>
            <Field id="address" label="Хүргэх хаяг" error={errors.address}>
              <Textarea id="address" value={values.address} onChange={set("address")} rows={2} placeholder="Дүүрэг, хороо, байр, тоот" aria-invalid={Boolean(errors.address)} />
            </Field>
            <Field id="address_note" label="Нэмэлт заавар" error={errors.address_note} hint="Орц, давхар, код, тэмдэг гэх мэт">
              <Input id="address_note" value={values.address_note} onChange={set("address_note")} />
            </Field>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Илгээмж ба төлбөр</h3>
            <Field id="package_description" label="Илгээмж" error={errors.package_description}>
              <Input id="package_description" value={values.package_description} onChange={set("package_description")} placeholder="Жишээ нь: Жижиг хайрцаг" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="amount_due"
                label="Төлөх дүн (₮)"
                error={errors.amount_due}
                hint={amountLocked ? "Төлбөр бүртгэгдсэн тул өөрчлөх боломжгүй." : "Төлбөргүй бол 0"}
              >
                <Input
                  id="amount_due"
                  value={values.amount_due}
                  onChange={set("amount_due")}
                  inputMode="numeric"
                  placeholder="0"
                  disabled={amountLocked}
                  className="tabular"
                  aria-invalid={Boolean(errors.amount_due)}
                />
              </Field>
              <Field id="scheduled_date" label="Хүргэх өдөр" error={errors.scheduled_date}>
                <Input id="scheduled_date" type="date" value={values.scheduled_date} onChange={set("scheduled_date")} />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <Field id="notes" label="Курьерт өгөх тэмдэглэл" error={errors.notes}>
              <Textarea id="notes" value={values.notes} onChange={set("notes")} rows={3} />
            </Field>
          </section>
        </form>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Болих
          </Button>
          <Button type="submit" form="delivery-form" disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {isEdit ? "Хадгалах" : "Үүсгэх"}
          </Button>
        </SheetFooter>
    </>
  );
}
