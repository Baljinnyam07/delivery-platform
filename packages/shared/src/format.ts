// Locale decisions (D7): MNT, Asia/Ulaanbaatar.
// Formatting is done manually where possible so output is identical on
// Node, browsers and Hermes (React Native).

export const CURRENCY = "MNT";
export const TIME_ZONE = "Asia/Ulaanbaatar";

/** 25000 → "25,000₮" (MNT has no minor units in practice). */
export function formatMNT(amount: number | string | null | undefined): string {
  const value = Math.round(Number(amount ?? 0));
  const sign = value < 0 ? "-" : "";
  const digits = Math.abs(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${digits}₮`;
}

type DateParts = { year: string; month: string; day: string; hour: string; minute: string };

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toParts(input: Date | string): DateParts {
  const date = typeof input === "string" ? new Date(input) : input;
  const parts: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) parts[p.type] = p.value;
  return {
    year: parts.year ?? "",
    month: parts.month ?? "",
    day: parts.day ?? "",
    hour: parts.hour ?? "",
    minute: parts.minute ?? "",
  };
}

/** "2026.11.05" in Ulaanbaatar time. */
export function formatDate(input: Date | string): string {
  const p = toParts(input);
  return `${p.year}.${p.month}.${p.day}`;
}

/** "2026.11.05 14:32" in Ulaanbaatar time. */
export function formatDateTime(input: Date | string): string {
  const p = toParts(input);
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/** "14:32" in Ulaanbaatar time. */
export function formatTime(input: Date | string): string {
  const p = toParts(input);
  return `${p.hour}:${p.minute}`;
}

/** Today's date in Ulaanbaatar as "YYYY-MM-DD" (for `scheduled_date`). */
export function todayInUlaanbaatar(now: Date = new Date()): string {
  const p = toParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "99112233" → "9911 2233" for display. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : phone;
}
