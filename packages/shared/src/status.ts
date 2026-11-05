import type {
  AssignmentEnd,
  AssignmentStart,
  DeliveryStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "./enums";

// Colors from docs/DESIGN_SYSTEM.md. Do not change without approval.
export const DELIVERY_STATUS_META: Record<
  DeliveryStatus,
  { label: string; color: string }
> = {
  UNASSIGNED: { label: "Хуваарилаагүй", color: "#94A3B8" },
  ASSIGNED: { label: "Хуваарилсан", color: "#2563EB" },
  IN_PROGRESS: { label: "Хүргэж байна", color: "#EAB308" },
  DELIVERED: { label: "Хүргэгдсэн", color: "#16A34A" },
  CANCELLED: { label: "Цуцалсан", color: "#DC2626" },
};

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; color: string }
> = {
  PAID: { label: "Төлөгдсөн", color: "#16A34A" },
  UNPAID: { label: "Төлөгдөөгүй", color: "#DC2626" },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Бэлэн",
  BANK_TRANSFER: "Дансаар",
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Админ",
  COURIER: "Курьер",
};

export const ASSIGNMENT_START_LABELS: Record<AssignmentStart, string> = {
  ASSIGNED: "Админ хуваарилсан",
  CLAIMED: "Курьер авсан",
  REASSIGNED: "Дахин хуваарилсан",
};

export const ASSIGNMENT_END_LABELS: Record<AssignmentEnd, string> = {
  REASSIGNED: "Өөр курьерт шилжүүлсэн",
  UNASSIGNED: "Хуваарилалтаас хассан",
  RETURNED: "Курьер буцаасан",
  CANCELLED: "Цуцалсан",
  COMPLETED: "Хүргэж дуусгасан",
};

// -------------------------------------------------------------
// UI mirror of the transition rules enforced by RPCs in the DB.
// The database is authoritative; this only decides which buttons
// to show. Keep in sync with docs/ARCHITECTURE.md §5.
// -------------------------------------------------------------
export type DeliveryAction =
  | "assign"
  | "claim"
  | "reassign"
  | "unassign"
  | "return"
  | "start"
  | "complete"
  | "cancel";

type ActionRule = {
  from: readonly DeliveryStatus[];
  role: UserRole;
  /** Courier actions on someone else's delivery are never allowed. */
  ownDeliveryOnly: boolean;
  requiresReason: boolean;
};

export const DELIVERY_ACTION_RULES: Record<DeliveryAction, ActionRule> = {
  assign: { from: ["UNASSIGNED"], role: "ADMIN", ownDeliveryOnly: false, requiresReason: false },
  claim: { from: ["UNASSIGNED"], role: "COURIER", ownDeliveryOnly: false, requiresReason: false },
  reassign: { from: ["ASSIGNED"], role: "ADMIN", ownDeliveryOnly: false, requiresReason: true },
  unassign: { from: ["ASSIGNED"], role: "ADMIN", ownDeliveryOnly: false, requiresReason: true },
  return: { from: ["ASSIGNED"], role: "COURIER", ownDeliveryOnly: true, requiresReason: true },
  start: { from: ["ASSIGNED"], role: "COURIER", ownDeliveryOnly: true, requiresReason: false },
  complete: { from: ["IN_PROGRESS"], role: "COURIER", ownDeliveryOnly: true, requiresReason: false },
  cancel: {
    from: ["UNASSIGNED", "ASSIGNED", "IN_PROGRESS"],
    role: "ADMIN",
    ownDeliveryOnly: false,
    requiresReason: true,
  },
};

export const DELIVERY_ACTION_LABELS: Record<DeliveryAction, string> = {
  assign: "Хуваарилах",
  claim: "Авах",
  reassign: "Дахин хуваарилах",
  unassign: "Хуваарилалтаас хасах",
  return: "Буцаах",
  start: "Хүргэлт эхлүүлэх",
  complete: "Хүргэгдсэн гэж тэмдэглэх",
  cancel: "Цуцлах",
};

export function canPerformAction(
  action: DeliveryAction,
  ctx: { status: DeliveryStatus; role: UserRole; isOwnDelivery: boolean },
): boolean {
  const rule = DELIVERY_ACTION_RULES[action];
  if (rule.role !== ctx.role) return false;
  if (!rule.from.includes(ctx.status)) return false;
  if (rule.ownDeliveryOnly && !ctx.isOwnDelivery) return false;
  return true;
}

export function availableActions(ctx: {
  status: DeliveryStatus;
  role: UserRole;
  isOwnDelivery: boolean;
}): DeliveryAction[] {
  return (Object.keys(DELIVERY_ACTION_RULES) as DeliveryAction[]).filter((a) =>
    canPerformAction(a, ctx),
  );
}

/** Mirrors record_payment(): who may record a payment, and when. */
export function canRecordPayment(ctx: {
  status: DeliveryStatus;
  paymentStatus: PaymentStatus;
  amountDue: number;
  role: UserRole;
  isOwnDelivery: boolean;
}): boolean {
  if (ctx.paymentStatus === "PAID" || ctx.amountDue <= 0) return false;
  if (ctx.status === "CANCELLED") return false;
  if (ctx.role === "ADMIN") return true;
  return ctx.isOwnDelivery && (ctx.status === "IN_PROGRESS" || ctx.status === "DELIVERED");
}
