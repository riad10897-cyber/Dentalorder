// Taking unavailable lines off an order.
//
// The database (remove_unavailable_lines) is what actually sets the new
// total: the lines that stay, at the prices they were first charged. This
// only lets the screens show the same figures beforehand and afterwards.
// Sums are in whole cents, so 4.90 + 2.50 is 7.40 and not a hair off.

const cents = (amount: number) => Math.round(amount * 100);

/** The total once the chosen lines are gone. */
export function totalWithout(lines: { lineId: string; lineTotal: number }[], removedIds: ReadonlySet<string>): number {
  return lines.reduce((sum, line) => (removedIds.has(line.lineId) ? sum : sum + cents(line.lineTotal)), 0) / 100;
}

/** What an order came to before lines were taken off it. */
export function totalBefore(total: number, removed: { line_total: number | string }[]): number {
  return (cents(total) + removed.reduce((sum, line) => sum + cents(Number(line.line_total)), 0)) / 100;
}
