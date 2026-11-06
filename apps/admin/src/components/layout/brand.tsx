import { cn } from "@/lib/utils";

/** Gradient tile with a stacked-parcel glyph — the product mark. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[linear-gradient(135deg,#00e5ff,#ff2bd6)] text-[#03030a] shadow-[0_0_16px_-6px_#00e5ff]",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-[58%]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round">
        <path d="M12 3 4 7l8 4 8-4-8-4Z" />
        <path d="m4 12 8 4 8-4" opacity={0.8} />
        <path d="m4 17 8 4 8-4" opacity={0.6} />
      </svg>
    </span>
  );
}

