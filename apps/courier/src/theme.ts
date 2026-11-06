// Design tokens — docs/DESIGN_SYSTEM.md. Do not change without approval.
import { DELIVERY_STATUS_META, PAYMENT_STATUS_META } from "@delivery/shared";

export const colors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  primary: "#2563EB",
  primaryPressed: "#1D4ED8",
  primarySoft: "#EFF6FF",
  text: "#0F172A",
  textSecondary: "#64748B",
  border: "#E2E8F0",
  muted: "#F1F5F9",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  success: "#16A34A",
  white: "#FFFFFF",
  overlay: "rgba(15, 23, 42, 0.45)",
} as const;

export const statusColor = {
  ...Object.fromEntries(Object.entries(DELIVERY_STATUS_META).map(([k, v]) => [k, v.color])),
  ...Object.fromEntries(Object.entries(PAYMENT_STATUS_META).map(([k, v]) => [k, v.color])),
} as Record<string, string>;

// Darker text shades of the same hues (yellow on white fails contrast).
export const statusText: Record<string, string> = {
  UNASSIGNED: "#6D28D9",
  ASSIGNED: "#1D4ED8",
  IN_PROGRESS: "#A16207",
  DELIVERED: "#15803D",
  CANCELLED: "#B91C1C",
  PAID: "#15803D",
  UNPAID: "#B91C1C",
};

export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const radius = { sm: 8, md: 10, lg: 12, xl: 16, full: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

/** Minimum touch target (DESIGN_SYSTEM: large touch targets, ≥ 48px). */
export const TOUCH = 48;

export const shadow = {
  shadowColor: "#0F172A",
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const;
