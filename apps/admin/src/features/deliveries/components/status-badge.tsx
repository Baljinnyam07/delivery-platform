import {
  DELIVERY_STATUS_META,
  PAYMENT_STATUS_META,
  type DeliveryStatus,
  type PaymentStatus,
} from "@delivery/shared";
import { cn } from "@/lib/utils";

// Text uses a darker shade of the same hue so labels stay readable
// (e.g. #EAB308 on white fails contrast). Dot uses the exact token color.
const TEXT: Record<DeliveryStatus | PaymentStatus, string> = {
  UNASSIGNED: "#475569",
  ASSIGNED: "#1D4ED8",
  IN_PROGRESS: "#A16207",
  DELIVERED: "#15803D",
  CANCELLED: "#B91C1C",
  PAID: "#15803D",
  UNPAID: "#B91C1C",
};

function Pill({ label, color, text, className }: { label: string; color: string; text: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium",
        className,
      )}
      style={{ backgroundColor: `${color}1A`, color: text }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}

export function DeliveryStatusBadge({ status, className }: { status: DeliveryStatus; className?: string }) {
  const meta = DELIVERY_STATUS_META[status];
  return <Pill label={meta.label} color={meta.color} text={TEXT[status]} className={className} />;
}

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const meta = PAYMENT_STATUS_META[status];
  return <Pill label={meta.label} color={meta.color} text={TEXT[status]} className={className} />;
}
