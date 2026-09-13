// Pure pricing math shared between the order builder's live total display
// and this module's own unit tests. The database is the actual source of
// truth at insert time (supabase/migrations/*_tooth_order_rpc.sql computes
// the same formula server-side) — this exists so the UI can show a total
// that matches what submission will produce, without trusting the client
// for anything that gets written.

import type { ToothType } from "@/lib/supabase/types";

export interface RepPrices {
  frasacoPrice: number;
  copyAPrice: number;
}

export interface ToothOrderItemInput {
  toothNumber: number;
  toothType: ToothType;
  quantity: number;
}

export interface PricedToothItem extends ToothOrderItemInput {
  unitPrice: number;
  lineTotal: number;
}

export function unitPriceFor(toothType: ToothType, prices: RepPrices): number {
  return toothType === "frasaco" ? prices.frasacoPrice : prices.copyAPrice;
}

export function priceToothItem(
  item: ToothOrderItemInput,
  prices: RepPrices,
): PricedToothItem {
  const unitPrice = unitPriceFor(item.toothType, prices);
  return {
    ...item,
    unitPrice,
    lineTotal: round2(unitPrice * item.quantity),
  };
}

export function priceToothOrder(
  items: ToothOrderItemInput[],
  prices: RepPrices,
): { items: PricedToothItem[]; subtotal: number } {
  const pricedItems = items.map((item) => priceToothItem(item, prices));
  const subtotal = round2(pricedItems.reduce((sum, item) => sum + item.lineTotal, 0));
  return { items: pricedItems, subtotal };
}

// Money is numeric(10,2) in the database — round the same way here so the
// UI's running total never drifts a cent from what gets written.
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
