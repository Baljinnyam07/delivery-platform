import { formatDate, formatMNT } from "@delivery/shared";

type Day = { day: string; created: number; delivered: number; cancelled: number; cash: number; transfer: number };

/** Nice round axis maximum: 0..max split into 4 steps. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const step = Math.ceil(value / 4);
  const magnitude = 10 ** Math.floor(Math.log10(step));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((m) => m >= step) ?? step;
  return nice * 4;
}

/**
 * Single-series bar chart (delivered per day). One hue, one axis, recessive
 * grid, 4px rounded data-ends, 2px gaps, hover/focus tooltip. The table below
 * the chart on the reports page is the accessible view of the same data.
 */
export function DailyDeliveredChart({ days }: { days: Day[] }) {
  const max = niceMax(Math.max(0, ...days.map((d) => d.delivered)));
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const showEvery = days.length > 16 ? Math.ceil(days.length / 8) : 1;

  return (
    <figure className="w-full pt-3" aria-label="Өдөр тутам хүргэгдсэн хүргэлтийн тоо">
      <div className="flex h-56 gap-2">
        {/* y axis */}
        <div className="relative w-8 shrink-0 text-right text-xs text-muted-foreground">
          {ticks.map((t) => (
            <span key={t} className="tabular absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* recessive grid */}
          {ticks.map((t) => (
            <div
              key={t}
              className={`absolute inset-x-0 border-t ${t === 0 ? "border-border" : "border-dashed border-border/70"}`}
              style={{ bottom: `${(t / max) * 100}%` }}
              aria-hidden
            />
          ))}

          {/* bars */}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {days.map((d) => {
              const h = (d.delivered / max) * 100;
              return (
                <div
                  key={d.day}
                  tabIndex={0}
                  className="group relative flex h-full flex-1 items-end justify-center outline-none"
                  aria-label={`${formatDate(d.day)}: ${d.delivered} хүргэсэн`}
                >
                  {/* hit target is the full column; mark is thin */}
                  <div
                    className="w-full max-w-7 rounded-t-[3px] bg-[linear-gradient(180deg,var(--neon-cyan),var(--neon-magenta))] transition-[filter] group-hover:brightness-125 group-focus-visible:brightness-125"
                    style={{ height: d.delivered > 0 ? `max(${h}%, 2px)` : 0 }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-44 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md group-hover:block group-focus-visible:block">
                    <p className="font-medium">{formatDate(d.day)}</p>
                    <dl className="mt-1 space-y-0.5 text-muted-foreground">
                      <div className="flex justify-between"><dt>Хүргэсэн</dt><dd className="tabular font-medium text-foreground">{d.delivered}</dd></div>
                      <div className="flex justify-between"><dt>Бүртгэсэн</dt><dd className="tabular">{d.created}</dd></div>
                      <div className="flex justify-between"><dt>Цуцалсан</dt><dd className="tabular">{d.cancelled}</dd></div>
                      <div className="flex justify-between"><dt>Орлого</dt><dd className="tabular">{formatMNT(Number(d.cash) + Number(d.transfer))}</dd></div>
                    </dl>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* x axis */}
      <div className="mt-2 flex gap-[2px] pl-10 text-xs text-muted-foreground">
        {days.map((d, i) => (
          <span key={d.day} className="tabular flex-1 text-center">
            {i % showEvery === 0 ? d.day.slice(5).replace("-", ".") : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}
