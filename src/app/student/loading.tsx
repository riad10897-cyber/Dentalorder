import { StudentBottomNav } from "./_components/bottom-nav";

// Mirrors the Market's shape ("Paper, native") so the page does not jump
// when the data arrives. The title and the nav are real chrome, painted
// at once; only the data-backed blocks are placeholders.
export default function StudentHomeLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[7.5rem] pt-1.5">
      <h1 className="px-1 pb-2.5 pt-1 text-large-title font-bold text-ink">Market</h1>

      <div className="h-[2.375rem] rounded-field bg-fill" />

      <div className="skeleton mt-4 h-[4.5rem] rounded-button" />

      <div className="skeleton mx-1 mb-1.5 mt-[1.375rem] h-3 w-24" />
      <div className="overflow-hidden rounded-group bg-card">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="ml-4 flex items-center justify-between border-b-[0.5px] border-separator py-3.5 pr-4 last:border-none"
          >
            <div>
              <div className="skeleton h-4 w-32" />
              <div className="skeleton mt-1.5 h-3 w-20" />
            </div>
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>

      <StudentBottomNav />
    </main>
  );
}
