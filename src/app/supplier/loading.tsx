import { SupplierBottomNav } from "./_components/bottom-nav";

export default function SupplierOrdersLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="px-5 pt-6">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton mt-2 h-7 w-56" />
      </header>

      <div className="mt-5 flex gap-1.5 px-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-9 w-24" />
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2.5 px-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-card border border-rule bg-card p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="skeleton h-4 w-32" />
                <div className="skeleton mt-1.5 h-3 w-24" />
              </div>
              <div className="skeleton h-5 w-14" />
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: 4 }, (_, j) => (
                <div key={j} className="skeleton h-5 w-9" />
              ))}
            </div>
            <div className="mt-3 flex gap-2 border-t border-hairline pt-3">
              <div className="skeleton h-11 flex-1" />
              <div className="skeleton h-11 flex-1" />
            </div>
          </div>
        ))}
      </div>

      <SupplierBottomNav />
    </main>
  );
}
