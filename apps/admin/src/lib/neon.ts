import type { DeliveryStatus, PaymentStatus } from "@delivery/shared";

/**
 * Cyberpunk status palette for the admin's dark theme. Solid = neon hue for
 * dots, stripes and glows; text = a lighter tint of the same hue that stays
 * readable on the near-black surfaces.
 */
export const NEON = {
  cyan: "#00E5FF",
  magenta: "#FF2BD6",
  yellow: "#FFE600",
  green: "#39FF88",
  violet: "#B026FF",
  red: "#FF2E63",
  orange: "#FF8A00",
  blue: "#3D7BFF",
} as const;

export const STATUS_COLOR: Record<DeliveryStatus | PaymentStatus, string> = {
  UNASSIGNED: NEON.violet,
  ASSIGNED: NEON.cyan,
  IN_PROGRESS: NEON.yellow,
  DELIVERED: NEON.green,
  CANCELLED: NEON.red,
  PAID: NEON.green,
  UNPAID: NEON.red,
};

export const STATUS_TEXT: Record<DeliveryStatus | PaymentStatus, string> = {
  UNASSIGNED: "#D69BFF",
  ASSIGNED: "#8AF4FF",
  IN_PROGRESS: "#FFF27A",
  DELIVERED: "#93FFBE",
  CANCELLED: "#FF8BA7",
  PAID: "#93FFBE",
  UNPAID: "#FF8BA7",
};
