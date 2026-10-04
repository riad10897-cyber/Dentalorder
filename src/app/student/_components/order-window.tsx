import { deadlineLabel } from "@/lib/orders/ordering-week";

/**
 * When to order by. Ordering weeks close every Saturday at 1:00 PM
 * (Beirut); students are asked to be in by 12:50. Worked out on the
 * server at request time, so it is always this week's Saturday.
 */
export function OrderWindow({ compact = false }: { compact?: boolean }) {
  const deadline = deadlineLabel();
  if (compact) {
    return (
      <p className="text-caption text-ink-muted">
        Order by <span className="text-ink">{deadline}</span>
      </p>
    );
  }
  return (
    <section
      aria-label="Ordering this week"
      className="mx-5 mt-4 flex items-start gap-3 rounded-card border border-rule bg-card px-4 py-3"
    >
      <svg aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <div className="min-w-0">
        <p className="font-display text-body text-ink">Orders are open for this week</p>
        <p className="text-small text-ink-muted">
          Order by <span className="text-ink">{deadline}</span>. After that, orders go into next week.
        </p>
      </div>
    </section>
  );
}
