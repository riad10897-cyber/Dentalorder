import type { ToothType } from "@/lib/supabase/types";

export interface PriceMove {
  toothType: ToothType;
  was: number;
  now: number;
}

/**
 * Did the supplier's prices move since this order was placed?
 *
 * Compared per tooth type, and only for types the order actually has — a
 * line's unit price is the only record of what that type cost then. An
 * order of Frasaco only says nothing about what Copy A used to cost, so a
 * Copy A change cannot be reported as "changed since you ordered".
 *
 * Compared in cents, so 2.5 and 2.50 are the same price.
 */
export function priceMovesSinceOrder(
  originalLines: { toothType: ToothType; unitPrice: number }[],
  current: { frasacoPrice: number; copyAPrice: number },
): PriceMove[] {
  const cents = (n: number) => Math.round(n * 100);
  const moves: PriceMove[] = [];

  for (const toothType of ["frasaco", "copy_a"] as const) {
    const line = originalLines.find((l) => l.toothType === toothType);
    if (!line) continue;
    const now = toothType === "frasaco" ? current.frasacoPrice : current.copyAPrice;
    if (cents(line.unitPrice) !== cents(now)) {
      moves.push({ toothType, was: line.unitPrice, now });
    }
  }
  return moves;
}
