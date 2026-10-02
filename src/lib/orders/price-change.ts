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

export interface ProductPriceMove {
  name: string;
  was: number;
  now: number;
}

/**
 * The extras on an order being edited, against what the seller sells now.
 *
 * `moves` are products still on sale at a different price. `gone` are
 * products on the original order the student can no longer have —
 * switched off, out of stock, or removed. The edit screen leaves those out
 * and says so, rather than carrying a line the database will refuse.
 */
export function productChangesSinceOrder(
  originalExtras: { productId: string; name: string; unitPrice: number }[],
  available: { productId: string; price: number }[],
): { moves: ProductPriceMove[]; gone: string[] } {
  const cents = (n: number) => Math.round(n * 100);
  const byId = new Map(available.map((p) => [p.productId, p]));
  const moves: ProductPriceMove[] = [];
  const gone: string[] = [];
  for (const line of originalExtras) {
    const now = byId.get(line.productId);
    if (!now) {
      gone.push(line.name);
      continue;
    }
    if (cents(now.price) !== cents(line.unitPrice)) {
      moves.push({ name: line.name, was: line.unitPrice, now: now.price });
    }
  }
  return { moves, gone };
}
