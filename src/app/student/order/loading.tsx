import { CHART_ROWS } from "@/lib/teeth/fdi";

// The chart's geometry is fixed and known before any data loads, so the
// arches are drawn at full size straight away ("Paper, native"). Only the
// seller's name, the prices and the extras wait on the server.
export default function NewOrderLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <header
        className="glass-bar fixed inset-x-0 top-0 z-30 mx-auto w-full max-w-md border-b-[0.5px] border-[rgba(20,18,15,0.14)]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="relative flex h-[3.75rem] items-center justify-center px-2">
          <div className="skeleton h-4 w-32" />
        </div>
      </header>
      <div aria-hidden style={{ height: "calc(3.75rem + env(safe-area-inset-top))" }} />

      <div className="mt-3">
        <div className="mx-4 h-[2.125rem] rounded-track bg-fill" />
        <div className="skeleton mx-auto mt-2 h-3 w-40" />
      </div>

      <div className="mx-2 mt-3.5 rounded-chart bg-card px-2 pb-[1.125rem] pt-4">
        {CHART_ROWS.map((row, rowIndex) => (
          <div key={rowIndex}>
            {rowIndex === 2 && <div aria-hidden className="h-[1.875rem]" />}
            <div className="flex justify-center" style={{ gap: "6px" }}>
              {row.teeth.map((tooth) => (
                <div key={tooth} className="flex h-12 w-9 items-center justify-center">
                  <div className="skeleton h-[2.625rem] w-[2.125rem] scale-[0.92] rounded-tooth" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
