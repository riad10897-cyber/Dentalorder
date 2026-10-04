import { SupplierBottomNav } from "./_components/bottom-nav";

// Mirrors the Orders tab ("Paper, native"): the week card, the status
// capsules, then order cards. Title and nav are real chrome.
export default function SupplierOrdersLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[7.5rem] pt-1.5">
      <h1 className="px-1 pb-2.5 pt-1 text-large-title font-bold text-ink">Orders</h1>

      <div className="skeleton h-[6.875rem] rounded-group" />

      <div className="mt-5 flex gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-9 w-24 rounded-full" />
        ))}
      </div>

      <div className="mt-3 h-[2.375rem] rounded-field bg-fill" />

      <div className="mt-3 flex flex-col gap-2.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-group bg-card p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="skeleton h-4 w-32" />
                <div className="skeleton mt-1.5 h-3 w-24" />
              </div>
              <div className="skeleton h-5 w-14" />
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: 4 }, (_, j) => (
                <div key={j} className="skeleton h-5 w-9 rounded-full" />
              ))}
            </div>
            <div className="mt-3 flex gap-2 border-t-[0.5px] border-separator pt-3">
              <div className="skeleton h-11 flex-[2] rounded-field" />
              <div className="skeleton h-11 flex-1 rounded-field" />
            </div>
          </div>
        ))}
      </div>

      <SupplierBottomNav />
    </main>
  );
}
