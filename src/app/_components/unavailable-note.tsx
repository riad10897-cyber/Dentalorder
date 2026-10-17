import type { UnavailableLine } from "@/lib/supabase/types";
import { totalBefore } from "@/lib/orders/unavailable";

/** "14 Frasaco ×1", "Nitrile gloves, M ×2": one taken-off line, in words. */
function describe(line: UnavailableLine): string {
  const what =
    line.tooth_number !== null
      ? `${line.tooth_number} ${line.tooth_type === "copy_a" ? "Copy A" : "Frasaco"}`
      : (line.product_name ?? "Item");
  return `${what} ×${line.quantity}`;
}

/**
 * What the seller took off an order because it wasn't available, and what
 * the total was before. The prices are the ones first charged, read from
 * the order itself, so "was" is always exact.
 *
 * Ink on a faint fill, not a status colour: red means Frasaco and green
 * means handed over, and this is neither.
 */
export function UnavailableNote({
  lines,
  total,
  sellerName,
}: {
  lines: UnavailableLine[];
  total: number;
  /** "Maria took off…" for the student; omitted on the seller's own card. */
  sellerName?: string;
}) {
  if (lines.length === 0) return null;
  const was = totalBefore(total, lines);
  return (
    <div className="mt-3 rounded-field bg-fill-faint px-3 py-2 text-list-secondary text-ink">
      <p>
        <span className="font-semibold">Not available</span>
        {sellerName ? `, taken off by ${sellerName}` : ", taken off"}:{" "}
        <span className="tnum">{lines.map(describe).join(", ")}</span>
      </p>
      <p className="tnum text-native-caption text-ink-muted">
        Total was ${was.toFixed(2)}, now ${total.toFixed(2)}
      </p>
    </div>
  );
}
