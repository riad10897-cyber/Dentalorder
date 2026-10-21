/**
 * Where an order stands, in a sentence, from the student's side.
 *
 * It used to be the raw status in a small grey tag, and "CONFIRMED" looked
 * exactly like "PENDING" — the one change a student is waiting to see was
 * the easiest thing on the card to miss. Each state now reads differently.
 *
 * Colours keep to their one job: --fulfilled appears only for an order
 * that has been handed over. Confirmed is ink and a tick, not green, so
 * "they said yes" never reads as "you have your teeth".
 */
export function OrderStatus({
  status,
  supplierName,
  when,
}: {
  status: string;
  supplierName: string;
  /** "3 h ago": when it reached this state. */
  when?: string;
}) {
  const time = when ? <span className="whitespace-nowrap font-normal text-ink-faint"> · {when}</span> : null;
  switch (status) {
    case "pending":
      return (
        <p className="text-list-secondary text-ink-muted">
          Waiting for {supplierName} to confirm
          {time}
        </p>
      );
    case "confirmed":
      return (
        <p className="flex items-center gap-1.5 text-list-secondary font-semibold text-ink">
          <Tick />
          <span>
            {supplierName} confirmed your order
            {time}
          </span>
        </p>
      );
    case "fulfilled":
      return (
        <p className="flex items-center gap-1.5 text-list-secondary font-semibold" style={{ color: "var(--fulfilled)" }}>
          <Tick />
          <span>
            Handed over
            {time}
          </span>
        </p>
      );
    case "rejected":
      return (
        <p className="text-list-secondary font-semibold text-ink">
          {supplierName} rejected this order
          {time}
        </p>
      );
    case "cancelled":
      return <p className="text-list-secondary text-ink-muted">Cancelled</p>;
    default:
      return <p className="text-list-secondary text-ink-muted">{status}</p>;
  }
}

function Tick() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
