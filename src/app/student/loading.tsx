import { StudentBottomNav } from "./_components/bottom-nav";

// Mirrors the real home layout's shape and spacing so the page does not
// jump when the data arrives. The nav and the greeting are real chrome,
// painted immediately; only the data-backed blocks are placeholders.
export default function StudentHomeLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="px-5 pt-6">
        <p className="text-small text-ink-muted">Good to see you,</p>
        <div className="skeleton mt-1 h-9 w-40" />
      </header>

      <section className="mx-5 mt-5 rounded-card border border-rule bg-card p-4">
        <p className="text-micro uppercase text-ink-faint">Semester</p>
        <div className="skeleton mt-2 h-6 w-32" />
        <div className="mt-3 flex gap-[2px]">
          {Array.from({ length: 17 }, (_, i) => (
            <span key={i} className="skeleton h-1.5 flex-1 rounded-[1px]" />
          ))}
        </div>
        <div className="skeleton mt-3 h-4 w-28" />
      </section>

      <div className="skeleton mx-5 mt-3 h-[4.75rem] rounded-card" />

      <h2 className="px-5 pb-2 pt-7 text-micro uppercase text-ink-faint">Recent orders</h2>
      <div className="mx-5 overflow-hidden rounded-card border border-rule bg-card">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-hairline px-4 py-3 last:border-none"
          >
            <div>
              <div className="skeleton h-4 w-20" />
              <div className="skeleton mt-1.5 h-3 w-28" />
            </div>
            <div className="skeleton h-4 w-14" />
          </div>
        ))}
      </div>

      <h2 className="px-5 pb-2 pt-7 text-micro uppercase text-ink-faint">You order from</h2>
      <section className="mx-5 rounded-card border border-rule bg-card p-4">
        <div className="skeleton h-4 w-32" />
        <div className="mt-3 flex gap-6">
          <div className="skeleton h-9 w-16" />
          <div className="skeleton h-9 w-16" />
        </div>
      </section>

      <StudentBottomNav />
    </main>
  );
}
