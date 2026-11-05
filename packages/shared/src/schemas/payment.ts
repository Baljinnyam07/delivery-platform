import { z } from "zod";
import { PAYMENT_METHODS } from "../enums";
import { MSG, amountSchema, idSchema, optionalText, reasonSchema } from "./common";

/** One full payment (D4): amount must equal `amount_due` — checked by the DB. */
export const recordPaymentSchema = z.object({
  deliveryId: idSchema,
  method: z.enum(PAYMENT_METHODS, MSG.required),
  amount: amountSchema.refine((v) => v > 0, MSG.invalidAmount),
  receiptPath: optionalText(300),
  note: optionalText(500),
});
export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;
export type RecordPayment = z.output<typeof recordPaymentSchema>;

export const voidPaymentSchema = z.object({
  paymentId: idSchema,
  reason: reasonSchema,
});
export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;
