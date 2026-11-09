import { z } from "zod";
import { PAYMENT_METHODS } from "../enums";
import { MSG, amountSchema, idSchema, optionalText, requiredText } from "./common";

export const MSG_PRODUCT = {
  quantity: "Ширхэг 1-ээс их бүхэл тоо байна.",
  stockChange: "Тоо ширхэг 0-ээс ялгаатай бүхэл тоо байна.",
  noItems: "Дор хаяж нэг бараа сонгоно уу.",
  duplicate: "Нэг барааг хоёр удаа сонгосон байна.",
} as const;

const quantitySchema = z.coerce.number(MSG_PRODUCT.quantity).int(MSG_PRODUCT.quantity).min(1, MSG_PRODUCT.quantity).max(100_000);

export const factorySchema = z.object({
  name: requiredText(120),
  is_active: z.boolean().default(true),
});
export type FactoryInput = z.input<typeof factorySchema>;

export const productSchema = z.object({
  factory_id: idSchema,
  name: requiredText(160),
  unit: requiredText(20).default("ш"),
  unit_price: amountSchema,
  low_stock_threshold: z.coerce.number().int().min(0).max(1_000_000).default(5),
  is_active: z.boolean().default(true),
});
export type ProductInput = z.input<typeof productSchema>;

/** Same fields minus the factory, which is fixed after creation. */
export const productUpdateSchema = productSchema.omit({ factory_id: true }).partial();

/** Restock (positive) or manual correction (any non-zero). */
export const adjustStockSchema = z
  .object({
    productId: idSchema,
    change: z.coerce.number(MSG_PRODUCT.stockChange).int(MSG_PRODUCT.stockChange),
    reason: z.enum(["RESTOCK", "ADJUSTMENT"]),
    note: optionalText(300),
  })
  .refine((v) => v.change !== 0 && (v.reason === "ADJUSTMENT" || v.change > 0), {
    message: MSG_PRODUCT.stockChange,
    path: ["change"],
  });
export type AdjustStockInput = z.input<typeof adjustStockSchema>;

export const deliveryItemSchema = z.object({
  product_id: idSchema,
  quantity: quantitySchema,
});
export type DeliveryItemInput = z.input<typeof deliveryItemSchema>;

export const deliveryItemsSchema = z
  .array(deliveryItemSchema)
  .max(50)
  .refine((items) => new Set(items.map((i) => i.product_id)).size === items.length, MSG_PRODUCT.duplicate);

/** Options of the create form that go beyond the delivery columns. */
export const deliveryCreateExtrasSchema = z.object({
  items: deliveryItemsSchema.default([]),
  /** null → computed from items by the database. */
  amount_override: amountSchema.nullish().transform((v) => v ?? null),
  /** Set when the customer has already paid (prepaid). */
  prepaid_method: z.enum(PAYMENT_METHODS, MSG.required).nullish().transform((v) => v ?? null),
});
export type DeliveryCreateExtrasInput = z.input<typeof deliveryCreateExtrasSchema>;
