"use client";

import {
  deliveryCreateSchema,
  deliveryUpdateSchema,
  formatMNT,
  todayInUlaanbaatar,
  type PaymentMethod,
} from "@delivery/shared";
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
import type { PickerProduct } from "@/features/products/queries";
import { cn } from "@/lib/utils";
import { createDelivery, updateDelivery } from "../actions";
import { DeliveryItemsEditor, PrepaidToggle, itemsTotal, type ItemDraft } from "./delivery-items-editor";

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
  /** Catalogue for the product picker (create mode). */
  products?: PickerProduct[];
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

export function DeliveryFormSheet({ open, onOpenChange, delivery, products = [] }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent
        className={cn(
          "flex flex-col gap-0 p-0 data-[side=right]:w-full",
          delivery ? "data-[side=right]:sm:max-w-lg" : "data-[side=right]:sm:max-w-[min(1120px,94vw)]",
        )}
      >
        {/* Content unmounts on close, so every open starts with fresh state. */}
        <DeliveryForm
          delivery={delivery}
          products={products}
          onClose={() => onOpenChange(false)}
          onBusyChange={setBusy}
        />
      </SheetContent>
    </Sheet>
  );
}

function DeliveryForm({
  delivery,
  products,
  onClose,
  onBusyChange,
}: {
  delivery?: EditableDelivery;
  products: PickerProduct[];
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

  // Create mode: product lines, auto amount (overridable) and prepaid flag.
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [amountManual, setAmountManual] = useState(false);
  const [prepaid, setPrepaid] = useState(false);
  const [prepaidMethod, setPrepaidMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const filledItems = items.filter((i) => i.product_id);
  const autoTotal = itemsTotal(filledItems, products);
  const useItems = !isEdit && filledItems.length > 0;
  const effectiveAmount = useItems && !amountManual ? autoTotal : Number(values.amount_due.replace(/\D/g, "") || 0);

  function itemsError(): string | null {
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const i of filledItems) {
      const qty = Number(i.quantity) || 0;
      const p = byId.get(i.product_id);
      if (qty < 1) return "Ширхэг 1-ээс их байна.";
      if (p && qty > p.stock) return `“${p.name}” нөөц ${p.stock} л байна.`;
    }
    return null;
  }

  function submit() {
    const payload = {
      ...values,
      amount_due: values.amount_due.replace(/\D/g, "") || "0",
    };
    const schema = isEdit ? deliveryUpdateSchema : deliveryCreateSchema;
    const parsed = schema.safeParse(isEdit ? payload : { ...payload, id: createId });
    const itemErr = isEdit ? null : itemsError();
    if (!parsed.success || itemErr) {
      const next: Record<string, string> = {};
      if (!parsed.success) for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      if (itemErr) next.items = itemErr;
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
        : await createDelivery({
            ...input,
            id: createId,
            items: filledItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
            amount_override: useItems && !amountManual ? null : payload.amount_due,
            prepaid_method: prepaid && effectiveAmount > 0 ? prepaidMethod : null,
          });

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

  const customerFields = (
    <>
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Харилцагч</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="customer_name" label="Нэр" error={errors.customer_name}>
            <Input id="customer_name" value={values.customer_name} onChange={set("customer_name")} autoFocus={!isEdit} aria-invalid={Boolean(errors.customer_name)} className="h-10" />
          </Field>
          <Field id="customer_phone" label="Утас" error={errors.customer_phone}>
            <Input id="customer_phone" value={values.customer_phone} onChange={set("customer_phone")} inputMode="tel" placeholder="9911 2233" aria-invalid={Boolean(errors.customer_phone)} className="tabular h-10" />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Хаяг</h3>
        <Field id="address" label="Хүргэх хаяг" error={errors.address}>
          <Textarea id="address" value={values.address} onChange={set("address")} rows={3} placeholder="Дүүрэг, хороо, байр, тоот" aria-invalid={Boolean(errors.address)} />
        </Field>
        <Field id="address_note" label="Нэмэлт заавар" error={errors.address_note} hint="Орц, давхар, код, тэмдэг гэх мэт">
          <Input id="address_note" value={values.address_note} onChange={set("address_note")} className="h-10" />
        </Field>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Хүргэлт</h3>
        <Field id="scheduled_date" label="Хүргэх өдөр" error={errors.scheduled_date}>
          <Input id="scheduled_date" type="date" value={values.scheduled_date} onChange={set("scheduled_date")} className="h-10 sm:w-56" />
        </Field>
        <Field id="notes" label="Курьерт өгөх тэмдэглэл" error={errors.notes}>
          <Textarea id="notes" value={values.notes} onChange={set("notes")} rows={3} placeholder="Жишээ нь: Ирэхээсээ 10 минутын өмнө залгана уу" />
        </Field>
      </section>
    </>
  );

  const amountField =
    useItems && !amountManual ? (
      <div className="space-y-1.5">
        <Label>Төлөх дүн</Label>
        <div className="flex h-10 items-center justify-between rounded-lg border bg-white/[0.02] px-3">
          <span className="tabular text-lg font-bold">{formatMNT(autoTotal)}</span>
          <button
            type="button"
            className="text-xs text-link hover:underline"
            onClick={() => {
              setValues((v) => ({ ...v, amount_due: String(autoTotal) }));
              setAmountManual(true);
            }}
          >
            Гараар засах
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Үнэ × ширхэгээр автоматаар бодогдоно</p>
      </div>
    ) : (
      <Field
        id="amount_due"
        label="Төлөх дүн (₮)"
        error={errors.amount_due}
        hint={
          amountLocked
            ? "Төлбөр бүртгэгдсэн тул өөрчлөх боломжгүй."
            : useItems
              ? `Барааны дүн: ${formatMNT(autoTotal)}`
              : "Төлбөргүй бол 0"
        }
      >
        <div className="flex items-center gap-2">
          <Input
            id="amount_due"
            value={values.amount_due}
            onChange={set("amount_due")}
            inputMode="numeric"
            placeholder="0"
            disabled={amountLocked}
            className="tabular h-10"
            aria-invalid={Boolean(errors.amount_due)}
          />
          {useItems ? (
            <button type="button" className="shrink-0 text-xs text-link hover:underline" onClick={() => setAmountManual(false)}>
              Автомат
            </button>
          ) : null}
        </div>
      </Field>
    );

  const packageField =
    isEdit || !useItems ? (
      <Field
        id="package_description"
        label="Илгээмжийн тайлбар"
        error={errors.package_description}
        hint={isEdit ? undefined : "Бараа сонгоогүй үед л бөглөнө."}
      >
        <Input id="package_description" value={values.package_description} onChange={set("package_description")} placeholder="Жишээ нь: Жижиг хайрцаг" className="h-10" />
      </Field>
    ) : null;

  const pieces = filledItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  return (
    <>
      <SheetHeader className="border-b px-4 py-4 pr-12 sm:px-6 sm:py-5">
        <SheetTitle className="text-lg">{isEdit ? `${delivery!.code} засах` : "Шинэ хүргэлт"}</SheetTitle>
        <SheetDescription className="max-sm:text-xs">
          {isEdit
            ? "Хүргэлтийн мэдээллийг шинэчилнэ."
            : "Хүргэлт үүсмэгц хуваарилаагүй төлөвт орно. Сонгосон бараа нөөцөөс хасагдана."}
        </SheetDescription>
      </SheetHeader>

      <form
        id="delivery-form"
        className="min-h-0 flex-1 overflow-y-auto"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        {isEdit ? (
          <div className="space-y-6 px-4 py-5 sm:px-6">
            {customerFields}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Илгээмж ба төлбөр</h3>
              {packageField}
              {amountField}
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:h-full lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            {/* Left: who and where */}
            <div className="space-y-6 px-4 py-5 sm:px-6 lg:overflow-y-auto lg:border-r">{customerFields}</div>

            {/* Right: what and how much */}
            <div className="space-y-6 border-t bg-white/[0.015] px-4 py-5 sm:px-6 lg:overflow-y-auto lg:border-t-0">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Бараа</h3>
                <DeliveryItemsEditor items={items} products={products} onChange={setItems} error={errors.items} />
              </section>
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Төлбөр</h3>
                {packageField}
                <div className="sm:max-w-xs">{amountField}</div>
                <PrepaidToggle
                  paid={prepaid && effectiveAmount > 0}
                  method={prepaidMethod}
                  onPaidChange={setPrepaid}
                  onMethodChange={setPrepaidMethod}
                  disabled={effectiveAmount === 0}
                />
              </section>
            </div>
          </div>
        )}
      </form>

      <SheetFooter className="gap-2.5 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-4">
        {isEdit ? null : (
          <div className="flex min-w-0 items-baseline justify-between gap-2 text-sm sm:mr-auto sm:block">
            <span className="text-muted-foreground">
              {useItems ? `${filledItems.length} бараа · ${pieces} ширхэг · ` : ""}Нийт{" "}
            </span>
            <span className="whitespace-nowrap">
              <span className="tabular text-base font-bold">{formatMNT(effectiveAmount)}</span>
              {prepaid && effectiveAmount > 0 ? <span className="ml-2 text-xs text-neon-green">● Төлөгдсөн</span> : null}
            </span>
          </div>
        )}
        <div className={cn("flex gap-2 sm:gap-3", isEdit && "sm:ml-auto")}>
          <Button variant="outline" onClick={onClose} disabled={pending} className="h-11 flex-1 sm:h-10 sm:flex-none">
            Болих
          </Button>
          <Button type="submit" form="delivery-form" disabled={pending} className="h-11 flex-[2] px-5 sm:h-10 sm:flex-none">
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {isEdit ? "Хадгалах" : "Хүргэлт үүсгэх"}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
