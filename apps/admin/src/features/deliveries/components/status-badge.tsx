import {
  DELIVERY_STATUS_META,
  PAYMENT_STATUS_META,
  type DeliveryStatus,
  type PaymentStatus,
} from "@delivery/shared";
import { STATUS_COLOR, STATUS_TEXT } from "@/lib/neon";
import { cn } from "@/lib/utils";

export { STATUS_COLOR, STATUS_TEXT };

/** Status pill: translucent fill, hairline in the hue, softly glowing dot. */
function Pill({ label, color, text, className }: { label: string; color: string; text: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
      style={{
        backgroundColor: `${color}1F`,
        color: text,
        boxShadow: `inset 0 0 0 1px ${color}33`,
      }}
    >
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function DeliveryStatusBadge({ status, className }: { status: DeliveryStatus; className?: string }) {
  return (
    <Pill
      label={DELIVERY_STATUS_META[status].label}
      color={STATUS_COLOR[status]}
      text={STATUS_TEXT[status]}
      className={className}
    />
  );
}

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <Pill
      label={PAYMENT_STATUS_META[status].label}
      color={STATUS_COLOR[status]}
      text={STATUS_TEXT[status]}
      className={className}
    />
  );
}
