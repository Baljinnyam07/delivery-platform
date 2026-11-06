import { cn } from "@/lib/utils";
import { toneFor } from "@/lib/tones";

/** Round initial badge with a stable per-person color. */
export function AvatarInitial({
  name,
  seed,
  className,
  muted = false,
}: {
  name: string;
  /** Stable key for the color (e.g. the profile id); defaults to the name. */
  seed?: string;
  className?: string;
  muted?: boolean;
}) {
  const tone = toneFor(seed ?? name);
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-card",
        muted && "opacity-50 grayscale",
        className,
      )}
      style={{ backgroundColor: tone.bg, color: tone.fg }}
      aria-hidden
    >
      {name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
