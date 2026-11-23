import { z } from "zod";
import { MSG, amountSchema, idSchema, requiredText } from "./common";

/** Expense on the report. factory_id null = split equally between the brands. */
export const expenseSchema = z.object({
  id: idSchema,
  spent_on: z.iso.date(MSG.invalidDate),
  amount: amountSchema.refine((v) => v > 0, "Дүн 0-ээс их байна."),
  description: requiredText(200),
  factory_id: idSchema.nullish().transform((v) => v ?? null),
});
export type ExpenseInput = z.input<typeof expenseSchema>;
