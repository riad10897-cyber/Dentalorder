/**
 * The product lines on an order, as they were ordered.
 *
 * Name, unit and price come from the line's own snapshot, not from the
 * product as it is today — a renamed or repriced product must not change
 * what an old order says.
 */
export function ExtrasLines({
  extras,
  className = "mt-3",
}: {
  extras: { name: string; unit: string | null; quantity: number; lineTotal: number }[];
  className?: string;
}) {
  if (extras.length === 0) return null;
  return (
    <ul className={`${className} flex flex-col gap-1 border-t border-hairline pt-2.5`}>
      {extras.map((extra, i) => (
        <li key={i} className="flex items-baseline justify-between gap-3 text-small">
          <span className="min-w-0 truncate text-ink">
            {extra.name}
            {extra.unit && <span className="text-ink-muted"> · {extra.unit}</span>}
            <span className="tnum font-display text-ink-muted"> ×{extra.quantity}</span>
          </span>
          <span className="tnum shrink-0 font-display text-ink">${extra.lineTotal.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  );
}

/** "4 teeth · 2 extras", "1 tooth", "3 extras" — whichever the order has. */
export function describeLines(teeth: number, extras: number): string {
  const parts: string[] = [];
  if (teeth > 0) parts.push(`${teeth} ${teeth === 1 ? "tooth" : "teeth"}`);
  if (extras > 0) parts.push(`${extras} ${extras === 1 ? "extra" : "extras"}`);
  return parts.join(" · ") || "Nothing";
}
