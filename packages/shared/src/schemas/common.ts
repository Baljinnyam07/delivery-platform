import { z } from "zod";

export const MSG = {
  required: "Заавал бөглөнө үү.",
  tooLong: (max: number) => `Хамгийн ихдээ ${max} тэмдэгт.`,
  invalidPhone: "Утасны дугаар 8 оронтой байх ёстой.",
  invalidEmail: "И-мэйл хаяг буруу байна.",
  invalidAmount: "Дүн 0 буюу түүнээс их бүхэл тоо байх ёстой.",
  invalidDate: "Огноо буруу байна.",
  invalidId: "Буруу дугаар.",
  coordsPair: "Өргөрөг, уртрагийг хамт оруулна уу.",
  passwordShort: "Нууц үг хамгийн багадаа 8 тэмдэгт.",
} as const;

export const idSchema = z.uuid(MSG.invalidId);

export const requiredText = (max: number) =>
  z.string(MSG.required).trim().min(1, MSG.required).max(max, MSG.tooLong(max));

/** Optional free text: "" / whitespace / undefined → null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, MSG.tooLong(max))
    .nullish()
    .transform((v) => (v ? v : null));

/**
 * Mongolian phone: 8 digits. Accepts spaces/dashes and an optional
 * +976 / 976 prefix; normalized to "99112233".
 */
export const phoneSchema = z
  .string(MSG.required)
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+?976(?=\d{8}$)/, ""))
  .pipe(z.string().regex(/^\d{8}$/, MSG.invalidPhone));

export const optionalPhoneSchema = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))
  .pipe(phoneSchema.nullable());

/** MNT amount: non-negative integer. */
export const amountSchema = z.coerce
  .number(MSG.invalidAmount)
  .int(MSG.invalidAmount)
  .min(0, MSG.invalidAmount)
  .max(9_999_999_999, MSG.invalidAmount);

/** "YYYY-MM-DD" or empty → null */
export const optionalDateSchema = z
  .union([z.iso.date(MSG.invalidDate), z.literal("")])
  .nullish()
  .transform((v) => (v ? v : null));

/** Mandatory reason for return / reassign / unassign / cancel / void. */
export const reasonSchema = requiredText(500);
