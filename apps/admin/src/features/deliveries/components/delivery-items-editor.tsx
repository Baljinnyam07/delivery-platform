"use client";

import { formatMNT, type PaymentMethod } from "@delivery/shared";
import {
  BanknoteIcon,
  CheckCircle2Icon,
  CheckIcon,
  LandmarkIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  ShoppingCartIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PickerProduct } from "@/features/products/queries";
import { NEON } from "@/lib/neon";
import { tint } from "@/lib/tones";
import { cn } from "@/lib/utils";

export type ItemDraft = { key: string; product_id: string; quantity: string };

export const newItemDraft = (productId = ""): ItemDraft => ({
  key: crypto.randomUUID(),
  product_id: productId,
  quantity: "1",
});

export function itemsTotal(items: ItemDraft[], products: PickerProduct[]) {
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.reduce((sum, i) => sum + (byId.get(i.product_id)?.unit_price ?? 0) * (Number(i.quantity) || 0), 0);
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function StockTag({ stock, className }: { stock: number; className?: string }) {
  const color = stock === 0 ? NEON.red : stock <= 5 ? NEON.yellow : NEON.green;
  return (
    <span
      className={cn("tabular shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium", className)}
      style={{ backgroundColor: tint(color, 14), color }}
    >
      {stock === 0 ? "дууссан" : `${stock} үлд.`}
    </span>
  );
}

/**
 * Product picker: search + factory chips + one-click add, and a cart below
 * with quantity steppers. Clicking a product already in the cart adds one more.
 */
export function DeliveryItemsEditor({
  items,
  products,
  onChange,
  error,
}: {
  items: ItemDraft[];
  products: PickerProduct[];
  onChange: (items: ItemDraft[]) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [factory, setFactory] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const factories = useMemo(
    () => [...new Map(products.map((p) => [p.factory_id, p.factory_name])).entries()],
    [products],
  );
  const inCart = new Map(items.map((i) => [i.product_id, i]));

  const results = useMemo(() => {
    const q = norm(query);
    const scoped = products.filter((p) => !factory || p.factory_id === factory);
    if (!q) return scoped;
    // Product-name matches first (prefix before substring), factory-name matches after.
    const rank = (p: PickerProduct) => {
      const name = norm(p.name);
      if (name.startsWith(q)) return 0;
      if (name.includes(q)) return 1;
      if (norm(p.factory_name).includes(q)) return 2;
      return -1;
    };
    return scoped
      .map((p) => [p, rank(p)] as const)
      .filter(([, r]) => r >= 0)
      .sort((a, b) => a[1] - b[1])
      .map(([p]) => p);
  }, [products, query, factory]);

  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
        Бараа бүртгэгдээгүй байна.{" "}
        <Link href="/products" className="text-link hover:underline">
          Бараа ба нөөц
        </Link>{" "}
        хэсгээс үйлдвэр, бараагаа нэмнэ үү.
      </p>
    );
  }

  function setQty(productId: string, qty: number) {
    if (qty <= 0) {
      onChange(items.filter((i) => i.product_id !== productId));
      return;
    }
    const existing = inCart.get(productId);
    onChange(
      existing
        ? items.map((i) => (i.product_id === productId ? { ...i, quantity: String(qty) } : i))
        : [...items, { ...newItemDraft(productId), quantity: String(qty) }],
    );
  }

  function add(p: PickerProduct) {
    if (p.stock === 0) return;
    const current = Number(inCart.get(p.id)?.quantity) || 0;
    setQty(p.id, Math.min(current + 1, p.stock));
  }

  const cart = items.filter((i) => byId.has(i.product_id));
  const total = itemsTotal(cart, products);
  const pieces = cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  return (
    <div className="space-y-3">
      {/* Search + factory filter */}
      <div className="overflow-hidden rounded-xl border bg-white/[0.02]">
        <div className="relative border-b">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter adds the first match — fast keyboard entry.
              if (e.key === "Enter") {
                e.preventDefault();
                const first = results.find((p) => p.stock > 0);
                if (first) add(first);
              }
            }}
            placeholder="Бараа хайх…"
            aria-label="Бараа хайх"
            enterKeyHint="done"
            className="h-11 rounded-none border-0 bg-transparent pr-9 pl-9 focus-visible:shadow-none sm:h-10 dark:bg-transparent"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-2 text-muted-foreground hover:text-foreground"
              aria-label="Хайлт цэвэрлэх"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-b px-2 py-2 [scrollbar-width:none]">
          {[[null, "Бүгд"] as const, ...factories].map(([id, name]) => (
            <button
              key={id ?? "all"}
              type="button"
              onClick={() => setFactory(id)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors sm:h-7",
                factory === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/[0.05] text-muted-foreground hover:bg-white/[0.09] hover:text-foreground",
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <ul className="max-h-[45vh] overflow-y-auto overscroll-contain py-1 sm:max-h-72" role="listbox" aria-label="Бараа">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">“{query}” олдсонгүй</li>
          ) : (
            results.map((p) => {
              const qty = Number(inCart.get(p.id)?.quantity) || 0;
              const out = p.stock === 0;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={qty > 0}
                    disabled={out}
                    onClick={() => add(p)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors sm:py-2",
                      out ? "cursor-not-allowed opacity-40" : "hover:bg-neon-cyan/[0.07]",
                      qty > 0 && "bg-neon-cyan/[0.05]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                        qty > 0 ? "border-neon-cyan bg-neon-cyan text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {qty > 0 ? qty : <PlusIcon className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="mt-0.5 flex min-w-0 items-center gap-2">
                        <StockTag stock={p.stock} className="sm:hidden" />
                        {factory ? null : (
                          <span className="truncate text-xs text-muted-foreground">{p.factory_name}</span>
                        )}
                      </span>
                    </span>
                    <StockTag stock={p.stock} className="max-sm:hidden" />
                    <span className="tabular shrink-0 text-right text-sm sm:w-20">{formatMNT(p.unit_price)}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* Cart */}
      {cart.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
          <ShoppingCartIcon className="size-4" />
          Дээрх жагсаалтаас бараа дээр дарж нэмнэ.
        </p>
      ) : (
        <div className="rounded-xl border">
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShoppingCartIcon className="size-3.5" />
              Сонгосон: {cart.length} бараа · {pieces} ширхэг
            </span>
            <button type="button" onClick={() => onChange([])} className="-my-1 py-1 hover:text-destructive">
              Бүгдийг арилгах
            </button>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {cart.map((item) => {
              const p = byId.get(item.product_id)!;
              const qty = Number(item.quantity) || 0;
              const over = qty > p.stock;
              return (
                <li key={item.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                  <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className={cn("text-xs", over ? "text-destructive" : "text-muted-foreground")}>
                      {over ? `Нөөц ${p.stock} л байна` : `${formatMNT(p.unit_price)} × ${qty}`}
                    </p>
                  </div>
                  <div className="flex items-center rounded-lg border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="max-sm:size-10"
                      onClick={() => setQty(p.id, qty - 1)}
                      aria-label={qty <= 1 ? "Хасах" : "Нэгээр хасах"}
                    >
                      {qty <= 1 ? <XIcon /> : <MinusIcon />}
                    </Button>
                    <input
                      value={item.quantity}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        onChange(items.map((i) => (i.key === item.key ? { ...i, quantity: v } : i)));
                      }}
                      onBlur={() => !Number(item.quantity) && setQty(p.id, 0)}
                      inputMode="numeric"
                      aria-label={`${p.name} ширхэг`}
                      className="tabular h-10 w-12 bg-transparent text-center text-base font-semibold outline-none sm:h-7 sm:w-10 sm:text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="max-sm:size-10"
                      onClick={() => setQty(p.id, qty + 1)}
                      disabled={qty >= p.stock}
                      aria-label="Нэгээр нэмэх"
                    >
                      <PlusIcon />
                    </Button>
                  </div>
                  <span className="tabular ml-auto w-24 text-right text-sm font-semibold sm:ml-0">{formatMNT(p.unit_price * qty)}</span>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t bg-white/[0.03] px-3 py-2.5">
            <span className="text-sm text-muted-foreground">Барааны дүн</span>
            <span className="tabular text-base font-bold">{formatMNT(total)}</span>
          </div>
        </div>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/** "Already paid" toggle with the payment method. */
export function PrepaidToggle({
  paid,
  method,
  onPaidChange,
  onMethodChange,
  disabled,
}: {
  paid: boolean;
  method: PaymentMethod;
  onPaidChange: (paid: boolean) => void;
  onMethodChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        paid ? "border-neon-green/40 bg-neon-green/[0.06]" : "bg-white/[0.02]",
        disabled && "opacity-50",
      )}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={paid}
          disabled={disabled}
          onChange={(e) => onPaidChange(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--neon-green)]"
        />
        <span className="space-y-0.5">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {paid ? <CheckCircle2Icon className="size-4 text-neon-green" /> : null}
            Төлбөр аль хэдийн төлөгдсөн
          </span>
          <span className="block text-xs text-muted-foreground">
            {disabled
              ? "Төлөх дүн 0 үед шаардлагагүй."
              : "Курьерт “Төлөгдсөн” гэж харагдана. Захиалагчаас мөнгө авахгүй."}
          </span>
        </span>
      </label>
      {paid ? (
        <div className="mt-3 grid grid-cols-2 gap-2 pl-7">
          {(
            [
              ["BANK_TRANSFER", "Дансаар", LandmarkIcon],
              ["CASH", "Бэлнээр", BanknoteIcon],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => onMethodChange(value)}
              className={cn(
                "flex h-9 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors",
                method === value
                  ? "border-neon-green/60 bg-neon-green/10 text-neon-green"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {method === value ? <CheckIcon className="size-4" /> : <Icon className="size-4" />}
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
