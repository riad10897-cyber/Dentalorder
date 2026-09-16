import { CHART_ROWS } from "@/lib/teeth/fdi";

// The chart's geometry is fixed and known before any data loads, so the
// grid is drawn at full size straight away. Only the header, prices and
// totals wait on the server.
export default function NewOrderLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <div className="flex items-center gap-3 px-5 pt-5">
        <div className="h-11 w-11 shrink-0" />
        <div>
          <div className="skeleton h-6 w-36" />
          <div className="skeleton mt-1.5 h-3 w-24" />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-hidden px-5 pb-1 pt-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-9 w-16 shrink-0" />
        ))}
      </div>

      <div className="mx-2 mt-3 rounded-card border border-rule bg-card px-2 py-4">
        <div className="mb-3 flex justify-center gap-4">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-4 w-28" />
        </div>
        <div className="py-1 text-center text-micro uppercase text-ink-faint">Upper</div>
        {CHART_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center" style={{ gap: "6px" }}>
            {row.teeth.map((tooth) => (
              <div key={tooth} className="flex h-12 w-9 items-center justify-center">
                <div className="skeleton h-[2.625rem] w-[2.125rem] rounded-control" />
              </div>
            ))}
          </div>
        ))}
        <div className="py-1 text-center text-micro uppercase text-ink-faint">Lower</div>
      </div>

      <div className="mx-2 mt-3 rounded-card border border-rule bg-card">
        <div className="border-b border-hairline px-4 py-3 text-micro uppercase text-ink-faint">
          In this order
        </div>
        <div className="px-4 py-5">
          <div className="skeleton mx-auto h-4 w-52" />
        </div>
      </div>
    </main>
  );
}
