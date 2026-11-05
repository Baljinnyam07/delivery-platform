import { z } from "zod";
import { MSG, idSchema, optionalPhoneSchema, phoneSchema, requiredText } from "./common";

const emailSchema = z.string(MSG.required).trim().toLowerCase().pipe(z.email(MSG.invalidEmail));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string(MSG.required).min(1, MSG.required),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Admin creates courier accounts (D2: email + password, no SMS OTP). */
export const courierCreateSchema = z.object({
  full_name: requiredText(120),
  email: emailSchema,
  phone: phoneSchema,
  password: z.string(MSG.required).min(8, MSG.passwordShort).max(72),
});
export type CourierCreateInput = z.input<typeof courierCreateSchema>;
export type CourierCreate = z.output<typeof courierCreateSchema>;

/** Self-service / admin profile edit (only columns clients may update). */
export const profileUpdateSchema = z.object({
  full_name: requiredText(120).optional(),
  phone: optionalPhoneSchema.optional(),
});
export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;

export const setCourierActiveSchema = z.object({
  courierId: idSchema,
  active: z.boolean(),
});
export type SetCourierActiveInput = z.infer<typeof setCourierActiveSchema>;
