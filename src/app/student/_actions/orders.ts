"use server";

import { createClient } from "@/lib/supabase/server";
import { editToothOrderSchema, submitToothOrderSchema } from "@/lib/validation/orders";
import type { SubmitToothOrderItem, ToothType } from "@/lib/supabase/types";

export type SubmitResult =
  | { kind: "placed"; orderId: string }
  // The supplier's prices are not the ones the student was shown. Nothing
  // was written; they are told the new total and asked to confirm it.
  | { kind: "pricesChanged"; newTotal: number }
  | { kind: "error"; message: string };

// Rounded to cents so float noise like 19.980000000000004 never reads as a
// price change. The database compares it as numeric.
function toCents(n: number): number {
  return Math.round(n * 100) / 100;
}

function pricesChanged(error: { code?: string; details?: string | null }): number | null {
  if (error.code !== "DT001") return null;
  const n = Number(error.details);
  return Number.isFinite(n) ? n : null;
}

// The client sends a supplier, teeth, type and quantity — never a price. Pricing and the total are
// computed inside submit_tooth_order (a SECURITY DEFINER function) from the
// supplier's current prices — this action can't lie about money even if it
// wanted to, because it never sends any.
export async function submitToothOrder(input: {
  supplierId: string;
  weekNumber: number;
  items: { toothNumber: number; toothType: ToothType; quantity: number }[];
  expectedTotal: number;
}): Promise<SubmitResult> {
  const parsed = submitToothOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { kind: "error", message: parsed.error.issues[0]?.message ?? "That order isn't valid." };
  }

  const supabase = await createClient();
  const items: SubmitToothOrderItem[] = parsed.data.items.map((item) => ({
    tooth_number: item.toothNumber,
    tooth_type: item.toothType,
    quantity: item.quantity,
  }));

  const { data, error } = await supabase.rpc("submit_tooth_order", {
    p_supplier_id: parsed.data.supplierId,
    p_week_number: parsed.data.weekNumber,
    p_items: items,
    p_expected_total: toCents(parsed.data.expectedTotal),
  });

  if (error) {
    const newTotal = pricesChanged(error);
    if (newTotal !== null) return { kind: "pricesChanged", newTotal };
    return { kind: "error", message: error.message };
  }
  return { kind: "placed", orderId: data };
}

export type EditResult =
  | { kind: "saved"; orderId: string }
  // The supplier's prices moved between the review screen and the tap.
  // Nothing was written; the student is shown the new total and asked again.
  | { kind: "pricesChanged"; newTotal: number }
  | { kind: "error"; message: string };

/**
 * Replace a pending order with a new selection, at current prices.
 *
 * All the rules — own order only, pending only, same supplier and week,
 * refused once confirmed — live in edit_pending_order. This action only
 * validates the shape and translates the two errors the app has to treat
 * differently: DT001 (prices moved) and DT002 (too late to edit).
 */
export async function editToothOrder(input: {
  orderId: string;
  items: { toothNumber: number; toothType: ToothType; quantity: number }[];
  expectedTotal: number;
}): Promise<EditResult> {
  const parsed = editToothOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { kind: "error", message: parsed.error.issues[0]?.message ?? "That order isn't valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("edit_pending_order", {
    p_order_id: parsed.data.orderId,
    p_items: parsed.data.items.map((item) => ({
      tooth_number: item.toothNumber,
      tooth_type: item.toothType,
      quantity: item.quantity,
    })),
    p_expected_total: toCents(parsed.data.expectedTotal),
  });

  if (error) {
    const newTotal = pricesChanged(error);
    if (newTotal !== null) return { kind: "pricesChanged", newTotal };
    return { kind: "error", message: error.message };
  }
  return { kind: "saved", orderId: data };
}

// "One tap" reorder: re-quotes the same teeth at the supplier's current prices
// (not the old snapshot — this is a new order) for next week.
//
// expectedTotal is the figure on the card the button sits on — the old
// order's total, unless the student has already been told the new one. If
// prices moved since, the database refuses and the button says so, rather
// than charging a number the card never showed.
export async function reorderOrder(orderId: string, expectedTotal: number): Promise<SubmitResult> {
  if (!Number.isFinite(expectedTotal) || expectedTotal < 0) {
    return { kind: "error", message: "That total isn't valid." };
  }
  const supabase = await createClient();

  const { data: oldOrder, error: fetchError } = await supabase
    .from("orders")
    .select("week_number, supplier_id, order_items(tooth_number, tooth_type, quantity)")
    .eq("id", orderId)
    .eq("order_type", "tooth")
    .single();

  if (fetchError || !oldOrder) {
    return { kind: "error", message: "That order couldn't be found." };
  }

  const items: SubmitToothOrderItem[] = (oldOrder.order_items ?? [])
    .filter((item) => item.tooth_number !== null && item.tooth_type !== null)
    .map((item) => ({
      tooth_number: item.tooth_number!,
      tooth_type: item.tooth_type!,
      quantity: item.quantity,
    }));

  if (items.length === 0) {
    return { kind: "error", message: "That order has no teeth to reorder." };
  }

  const nextWeek = Math.min((oldOrder.week_number ?? 0) + 1, 17);

  if (!oldOrder.supplier_id) {
    return { kind: "error", message: "That order has no supplier to reorder from." };
  }

  const { data, error } = await supabase.rpc("submit_tooth_order", {
    p_supplier_id: oldOrder.supplier_id,
    p_week_number: nextWeek,
    p_items: items,
    p_expected_total: toCents(expectedTotal),
  });

  if (error) {
    const newTotal = pricesChanged(error);
    if (newTotal !== null) return { kind: "pricesChanged", newTotal };
    return { kind: "error", message: error.message };
  }
  return { kind: "placed", orderId: data };
}
