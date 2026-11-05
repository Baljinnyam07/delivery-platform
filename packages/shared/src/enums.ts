import { Constants, type Database, type Tables } from "./database.types";

type Enums = Database["public"]["Enums"];

export type UserRole = Enums["user_role"];
export type DeliveryStatus = Enums["delivery_status"];
export type PaymentMethod = Enums["payment_method"];
export type PaymentStatus = Enums["payment_status"];
export type AssignmentStart = Enums["assignment_start"];
export type AssignmentEnd = Enums["assignment_end"];

// Runtime lists come from the generated `Constants`, so they can never
// drift from the database enums.
export const USER_ROLES = Constants.public.Enums.user_role;
export const DELIVERY_STATUSES = Constants.public.Enums.delivery_status;
export const PAYMENT_METHODS = Constants.public.Enums.payment_method;
export const PAYMENT_STATUSES = Constants.public.Enums.payment_status;
export const ASSIGNMENT_STARTS = Constants.public.Enums.assignment_start;
export const ASSIGNMENT_ENDS = Constants.public.Enums.assignment_end;

// notifications.type is a CHECK constraint (not an enum) — keep in sync
// with supabase/migrations/*_notifications.sql.
export const NOTIFICATION_TYPES = [
  "DELIVERY_ASSIGNED",
  "DELIVERY_REMOVED",
  "DELIVERY_CANCELLED",
  "DELIVERY_AVAILABLE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Row types
export type Profile = Tables<"profiles">;
export type Delivery = Tables<"deliveries">;
export type DeliveryAssignment = Tables<"delivery_assignments">;
export type DeliveryStatusHistory = Tables<"delivery_status_history">;
export type PaymentRecord = Tables<"payment_records">;
export type Notification = Tables<"notifications">;
export type AvailableDelivery =
  Database["public"]["Functions"]["list_available_deliveries"]["Returns"][number];
