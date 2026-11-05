// Stable error codes raised by RPC functions (RAISE EXCEPTION '<CODE>').
// Keep in sync with supabase/migrations and docs/ARCHITECTURE.md §8.
export const RPC_ERROR_MESSAGES = {
  NOT_AUTHORIZED: "Танд энэ үйлдлийг хийх эрх байхгүй.",
  USER_INACTIVE: "Таны эрх идэвхгүй байна. Админтай холбогдоно уу.",
  DELIVERY_NOT_FOUND: "Хүргэлт олдсонгүй.",
  DELIVERY_NOT_AVAILABLE: "Энэ хүргэлтийг өөр курьер авсан байна.",
  INVALID_TRANSITION: "Хүргэлтийн одоогийн төлөвт энэ үйлдлийг хийх боломжгүй.",
  REASON_REQUIRED: "Шалтгаанаа заавал оруулна уу.",
  SAME_COURIER: "Хүргэлт аль хэдийн энэ курьерт хуваарилагдсан байна.",
  COURIER_NOT_FOUND: "Курьер олдсонгүй.",
  COURIER_INACTIVE: "Курьер идэвхгүй байна.",
  HAS_ACTIVE_DELIVERIES: "Курьерт идэвхтэй хүргэлт байна. Эхлээд дахин хуваарилна уу.",
  PAYMENT_NOT_ALLOWED: "Одоогоор төлбөр бүртгэх боломжгүй.",
  PAYMENT_NOT_REQUIRED: "Энэ хүргэлтэд төлбөр шаардлагагүй.",
  PAYMENT_ALREADY_RECORDED: "Төлбөр аль хэдийн бүртгэгдсэн байна.",
  PAYMENT_NOT_FOUND: "Төлбөрийн бүртгэл олдсонгүй.",
  PAYMENT_ALREADY_VOIDED: "Төлбөр аль хэдийн хүчингүй болсон байна.",
  AMOUNT_MISMATCH: "Төлбөрийн дүн хүргэлтийн дүнтэй тэнцүү байх ёстой.",
  AMOUNT_LOCKED: "Төлбөр бүртгэгдсэн тул дүнг өөрчлөх боломжгүй.",
  INVALID_RECEIPT_PATH: "Баримтын файл буруу байна.",
  INVALID_RANGE: "Огнооны хүрээ буруу байна (дээд тал нь 1 жил).",
} as const;

export type RpcErrorCode = keyof typeof RPC_ERROR_MESSAGES;

export const RPC_ERROR_CODES = Object.keys(RPC_ERROR_MESSAGES) as RpcErrorCode[];

export const GENERIC_ERROR_MESSAGE = "Алдаа гарлаа. Дахин оролдоно уу.";

/** Minimal shape of a Supabase/PostgREST error. */
type ErrorLike = { code?: string | null; message?: string | null } | null | undefined;

function isRpcErrorCode(value: unknown): value is RpcErrorCode {
  return typeof value === "string" && value in RPC_ERROR_MESSAGES;
}

/** Extracts our stable code from a Supabase error, if it is one of ours. */
export function getRpcErrorCode(error: ErrorLike): RpcErrorCode | null {
  if (!error) return null;
  if (isRpcErrorCode(error.message)) return error.message;
  // Postgres "insufficient_privilege" (RLS / grants)
  if (error.code === "42501") return "NOT_AUTHORIZED";
  return null;
}

/** User-facing Mongolian message for any Supabase error. */
export function getErrorMessage(error: ErrorLike): string {
  const code = getRpcErrorCode(error);
  return code ? RPC_ERROR_MESSAGES[code] : GENERIC_ERROR_MESSAGE;
}
