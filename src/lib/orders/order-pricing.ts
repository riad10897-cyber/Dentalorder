// The whole weekly order on screen: teeth and extras together.
//
// Like tooth-pricing, this only exists so the screen can show the total
// the database will produce. submit_tooth_order prices every line itself
// from the database and refuses the order if the total it computes differs
// from the one sent with it — so this has to agree with the database to
// the cent, or a student is told "prices changed" when nothing did.
//
// Sums are done in whole cents. Adding 6.50 and 3.10 as floats can land a
// hair off 9.60, and the total sent to the database must be exact.

import { priceToothOrder, type PricedToothItem, type RepPrices, type ToothOrderItemInput } from "./tooth-pricing";

export interface ExtraInput {
  productId: string;
  quantity: number;
}

export interface ExtraPrice {
  productId: string;
  name: string;
  unit: string | null;
  price: number;
}

export interface PricedExtra extends ExtraInput {
  name: string;
  unit: string | null;
  unitPrice: number;
  lineTotal: number;
}

const toCents = (n: number) => Math.round(n * 100);
const fromCents = (c: number) => c / 100;

/**
 * Prices the extras a student has picked. A pick whose product is not in
 * `available` (switched off, out of stock, gone since the screen loaded)
 * is left out of the total and returned in `unavailable` — the screen
 * must say so rather than total something the database will refuse.
 */
export function priceExtras(
  picks: ExtraInput[],
  available: ExtraPrice[],
): { items: PricedExtra[]; subtotal: number; unavailable: string[] } {
  const byId = new Map(available.map((p) => [p.productId, p]));
  const items: PricedExtra[] = [];
  const unavailable: string[] = [];
  let cents = 0;

  for (const pick of picks) {
    if (pick.quantity <= 0) continue;
    const product = byId.get(pick.productId);
    if (!product) {
      unavailable.push(pick.productId);
      continue;
    }
    const lineCents = toCents(product.price) * pick.quantity;
    cents += lineCents;
    items.push({
      ...pick,
      name: product.name,
      unit: product.unit,
      unitPrice: product.price,
      lineTotal: fromCents(lineCents),
    });
  }
  return { items, subtotal: fromCents(cents), unavailable };
}

/** Teeth plus extras, as one total in cents-exact dollars. */
export function priceWeeklyOrder(
  teeth: ToothOrderItemInput[],
  prices: RepPrices,
  picks: ExtraInput[],
  available: ExtraPrice[],
): {
  teeth: PricedToothItem[];
  extras: PricedExtra[];
  unavailable: string[];
  total: number;
} {
  const t = priceToothOrder(teeth, prices);
  const e = priceExtras(picks, available);
  return {
    teeth: t.items,
    extras: e.items,
    unavailable: e.unavailable,
    total: fromCents(toCents(t.subtotal) + toCents(e.subtotal)),
  };
}
