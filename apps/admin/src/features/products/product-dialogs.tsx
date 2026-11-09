"use client";

import { formatMNT, todayInUlaanbaatar } from "@delivery/shared";
import { FactoryIcon, Loader2Icon, MinusIcon, PackagePlusIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/features/deliveries/actions";
import { cn } from "@/lib/utils";
import { adjustStock, createFactory, createProduct, updateFactory, updateProduct } from "./actions";
import type { ProductRow } from "./queries";

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

function useSubmit(onDone: () => void, success: string) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  function run(fn: () => Promise<ActionResult<unknown>>) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(success);
        onDone();
        router.refresh();
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
      }
    });
  }
  return { errors, pending, run };
}

const digits = (v: string) => v.replace(/\D/g, "");

// ---------------- Factory ----------------

type FactoryValue = { id: string; name: string; code_letter: string | null };

export function FactoryDialogButton({ factory }: { factory?: FactoryValue }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {factory ? (
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Үйлдвэрийн нэр засах">
          <PencilIcon />
        </Button>
      ) : (
        <Button variant="outline" className="h-9" onClick={() => setOpen(true)}>
          <FactoryIcon />
          Үйлдвэр нэмэх
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          {open ? <FactoryForm factory={factory} onClose={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FactoryForm({ factory, onClose }: { factory?: FactoryValue; onClose: () => void }) {
  const [name, setName] = useState(factory?.name ?? "");
  const [letter, setLetter] = useState(factory?.code_letter ?? "");
  const { errors, pending, run } = useSubmit(onClose, factory ? "Хадгалагдлаа." : "Үйлдвэр нэмэгдлээ.");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const input = { name, code_letter: letter };
        run(() => (factory ? updateFactory(factory.id, input) : createFactory(input)));
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>{factory ? "Үйлдвэр засах" : "Шинэ үйлдвэр"}</DialogTitle>
        <DialogDescription>Бараа бүр нэг үйлдвэрт харьяалагдана. Тайлан үйлдвэр тус бүрээр гарна.</DialogDescription>
      </DialogHeader>
      <Field id="factory_name" label="Нэр" error={errors.name}>
        <Input id="factory_name" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-9" />
      </Field>
      <Field
        id="factory_letter"
        label="Захиалгын үсэг"
        error={errors.code_letter}
        hint={`Захиалгын дугаар: ${letter || "D"}${todayInUlaanbaatar().slice(2).replaceAll("-", "")}-001. Хоосон бол D.`}
      >
        <Input
          id="factory_letter"
          value={letter}
          onChange={(e) => setLetter(e.target.value.replace(/[^a-z]/gi, "").slice(-1).toUpperCase())}
          maxLength={1}
          placeholder="N"
          className="h-9 w-16 text-center font-semibold uppercase"
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Болих
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Хадгалах
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---------------- Product ----------------

export function ProductDialogButton({
  factory,
  product,
}: {
  factory: { id: string; name: string };
  product?: ProductRow;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {product ? (
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label={`${product.name} засах`}>
          <PencilIcon />
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <PlusIcon />
          Бараа нэмэх
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {open ? <ProductForm factory={factory} product={product} onClose={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProductForm({
  factory,
  product,
  onClose,
}: {
  factory: { id: string; name: string };
  product?: ProductRow;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    name: product?.name ?? "",
    unit: product?.unit ?? "ш",
    unit_price: product ? String(Math.round(product.unit_price)) : "",
    low_stock_threshold: String(product?.low_stock_threshold ?? 5),
    is_active: product?.is_active ?? true,
  });
  const { errors, pending, run } = useSubmit(onClose, product ? "Хадгалагдлаа." : "Бараа нэмэгдлээ.");
  const set = (k: "name" | "unit" | "unit_price" | "low_stock_threshold") => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const payload = {
          ...values,
          unit_price: digits(values.unit_price) || "0",
          low_stock_threshold: digits(values.low_stock_threshold) || "0",
        };
        run(() =>
          product ? updateProduct(product.id, payload) : createProduct({ ...payload, factory_id: factory.id }),
        );
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>{product ? "Бараа засах" : "Шинэ бараа"}</DialogTitle>
        <DialogDescription>{factory.name}</DialogDescription>
      </DialogHeader>
      <Field id="product_name" label="Барааны нэр" error={errors.name}>
        <Input id="product_name" value={values.name} onChange={set("name")} autoFocus className="h-9" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="unit_price" label="Нэгжийн үнэ (₮)" error={errors.unit_price}>
          <Input
            id="unit_price"
            value={values.unit_price}
            onChange={set("unit_price")}
            inputMode="numeric"
            placeholder="0"
            className="tabular h-9"
          />
        </Field>
        <Field id="unit" label="Хэмжих нэгж" error={errors.unit} hint="ш, хайрцаг, кг…">
          <Input id="unit" value={values.unit} onChange={set("unit")} className="h-9" />
        </Field>
      </div>
      <Field
        id="low_stock_threshold"
        label="Нөөц бага гэж анхааруулах хэмжээ"
        error={errors.low_stock_threshold}
        hint="Нөөц үүнээс доош ороход шараар тэмдэглэнэ."
      >
        <Input
          id="low_stock_threshold"
          value={values.low_stock_threshold}
          onChange={set("low_stock_threshold")}
          inputMode="numeric"
          className="tabular h-9 w-32"
        />
      </Field>
      {product ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
            className="size-4 accent-[var(--neon-cyan)]"
          />
          Идэвхтэй (хүргэлтэд сонгогдоно)
        </label>
      ) : (
        <p className="text-xs text-muted-foreground">Нөөцийг бараа үүсгэсний дараа “Нөөц нэмэх” товчоор оруулна.</p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Болих
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Хадгалах
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---------------- Stock ----------------

export function StockDialogButton({ product }: { product: ProductRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PackagePlusIcon />
        <span className="max-sm:sr-only">Нөөц</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          {open ? <StockForm product={product} onClose={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StockForm({ product, onClose }: { product: ProductRow; onClose: () => void }) {
  const [mode, setMode] = useState<"RESTOCK" | "ADJUSTMENT">("RESTOCK");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const { errors, pending, run } = useSubmit(onClose, "Нөөц шинэчлэгдлээ.");

  const amount = Number(digits(qty) || 0);
  const change = mode === "RESTOCK" ? amount : amount * direction;
  const after = product.stock + change;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => adjustStock({ productId: product.id, change, reason: mode, note }));
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>{product.name}</DialogTitle>
        <DialogDescription>
          Одоогийн нөөц: <span className="tabular font-semibold text-foreground">{product.stock}</span> {product.unit}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(
          [
            ["RESTOCK", "Нөөц нэмэх"],
            ["ADJUSTMENT", "Тооллогын засвар"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "h-8 rounded-md text-sm font-medium transition-colors",
              mode === value ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Field id="stock_qty" label={mode === "RESTOCK" ? "Нэмэх тоо" : "Засварын тоо"} error={errors.change}>
        <div className="flex items-center gap-2">
          {mode === "ADJUSTMENT" ? (
            <div className="flex rounded-lg border">
              <Button
                type="button"
                variant={direction === -1 ? "default" : "ghost"}
                size="icon"
                onClick={() => setDirection(-1)}
                aria-label="Хасах"
              >
                <MinusIcon />
              </Button>
              <Button
                type="button"
                variant={direction === 1 ? "default" : "ghost"}
                size="icon"
                onClick={() => setDirection(1)}
                aria-label="Нэмэх"
              >
                <PlusIcon />
              </Button>
            </div>
          ) : null}
          <Input
            id="stock_qty"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            autoFocus
            className="tabular h-9"
          />
        </div>
      </Field>
      <Field id="stock_note" label="Тайлбар" error={errors.note} hint="Жишээ нь: Үйлдвэрээс 11/07-нд ирсэн">
        <Input id="stock_note" value={note} onChange={(e) => setNote(e.target.value)} className="h-9" />
      </Field>

      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        Дараа нь:{" "}
        <span className={cn("tabular font-semibold", after < 0 ? "text-destructive" : "text-foreground")}>{after}</span>{" "}
        {product.unit} · {formatMNT(Math.max(after, 0) * product.unit_price)}
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Болих
        </Button>
        <Button type="submit" disabled={pending || amount === 0 || after < 0}>
          {pending ? <Loader2Icon className="animate-spin" /> : null}
          Хадгалах
        </Button>
      </DialogFooter>
    </form>
  );
}
