import type { ToothType } from "@/lib/supabase/types";

// Keyed by tooth number + type (not tooth number alone) so a student can
// order both Frasaco and Copy A for the same FDI position in one order.
//
// Its own module, not the chart's: the chart is a client component, and a
// server page that builds selections (editing an order does) cannot call
// a function that lives in a client file.
export type ToothSelectionKey = `${number}:${ToothType}`;
export type ToothSelections = Record<ToothSelectionKey, { toothType: ToothType; quantity: number }>;

export function toothSelectionKey(toothNumber: number, toothType: ToothType): ToothSelectionKey {
  return `${toothNumber}:${toothType}`;
}
