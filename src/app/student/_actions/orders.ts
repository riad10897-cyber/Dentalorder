"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { editToothOrderSchema, submitToothOrderSchema } from "@/lib/validation/orders";
import type { SubmitToothOrderItem, ToothType } from "@/lib/supabase/types";
import { friendlyOrderError } from "@/lib/orders/errors";

export type SubmitResult =
  | { kind: "placed"; orderId: string }
  // The supplier's prices are not the ones the student was shown. Nothing
  // was written; they are told the new total and asked to confirm it.
  | { kind: "pricesChanged"; newTotal: number }
  // An extra on the order is no longer available. Nothing was written.
  | { kind: "productGone"; message: string }
  | { kind: "error"; message: string };

// Rounded to cents so float noise like 19.980000000000004 never reads as a
// price change. The database compares it as numeric.
function toCents(n: number): number {
  return Math.round(n * 100) / 100;
}

type LineInput = {
  items: { toothNumber: number; toothType: ToothType; quantity: number }[];
  extras: { productId: string; quantity: number }[];
};

// Ids and quantities only. Every price is read by the database.
function toRpcItems(lines: LineInput): SubmitToothOrderItem[] {
  return [
    ...lines.items.map((item) => ({
      tooth_number: item.toothNumber,
      tooth_type: item.toothType,
      quantity: item.quantity,
    })),
    ...lines.extras.map((extra) => ({ product_id: extra.productId, quantity: extra.quantity })),
  ];
}

// DT003: a product is no longer available (switched off, out of stock).
// The screen reloads the seller's current list and says which.
function productGone(error: { code?: string }): boolean {
  return error.code === "DT003";
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
  extras?: { productId: string; quantity: number }[];
  expectedTotal: number;
}): Promise<SubmitResult> {
  const parsed = submitToothOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { kind: "error", message: parsed.error.issues[0]?.message ?? "That order isn't valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_tooth_order", {
    p_supplier_id: parsed.data.supplierId,
    p_week_number: parsed.data.weekNumber,
    p_items: toRpcItems(parsed.data),
    p_expected_total: toCents(parsed.data.expectedTotal),
  });

  if (error) {
    const newTotal = pricesChanged(error);
    if (newTotal !== null) return { kind: "pricesChanged", newTotal };
    if (productGone(error)) return { kind: "productGone", message: error.message };
    return { kind: "error", message: friendlyOrderError(error.message) };
  }
  return { kind: "placed", orderId: data };
}

export type EditResult =
  | { kind: "saved"; orderId: string }
  // The supplier's prices moved between the review screen and the tap.
  // Nothing was written; the student is shown the new total and asked again.
  | { kind: "pricesChanged"; newTotal: number }
  | { kind: "productGone"; message: string }
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
  extras?: { productId: string; quantity: number }[];
  expectedTotal: number;
}): Promise<EditResult> {
  const parsed = editToothOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { kind: "error", message: parsed.error.issues[0]?.message ?? "That order isn't valid." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("edit_pending_order", {
    p_order_id: parsed.data.orderId,
    p_items: toRpcItems(parsed.data),
    p_expected_total: toCents(parsed.data.expectedTotal),
  });

  if (error) {
    const newTotal = pricesChanged(error);
    if (newTotal !== null) return { kind: "pricesChanged", newTotal };
    if (productGone(error)) return { kind: "productGone", message: error.message };
    return { kind: "error", message: friendlyOrderError(error.message) };
  }
  return { kind: "saved", orderId: data };
}

/**
 * Withdraw a pending order. Nothing is deleted: it is marked cancelled and
 * kept. Who may, and when, is decided by cancel_pending_order — own order
 * only, pending only — so this only validates the id and reports back.
 */
export async function cancelOrder(orderId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!z.string().uuid().safeParse(orderId).success) {
    return { ok: false, message: "That order isn't valid." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_pending_order", { p_order_id: orderId });
  if (error) return { ok: false, message: friendlyOrderError(error.message) };
  revalidatePath("/student/orders");
  return { ok: true };
}
