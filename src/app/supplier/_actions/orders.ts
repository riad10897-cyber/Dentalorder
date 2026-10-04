"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SUPPLIER_DIRECTORY_TAG } from "@/lib/supplier/directory";
import {
  rejectOrderSchema,
  updateOrderStatusSchema,
  updateRepPricesSchema,
  currentWeekSchema,
} from "@/lib/validation/orders";
import type { Database } from "@/lib/supabase/types";

type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

export type ActionResult = { ok: true } | { ok: false; error: string };

// RLS (orders_update_rep) already confines this to the caller's own tooth
// orders, and the protective trigger blocks money/identity fields for every
// role — this just narrows what a rep is offered in the UI to begin with.
export async function updateOrderStatus(input: {
  orderId: string;
  fulfillmentStatus?: "pending" | "confirmed" | "fulfilled" | "cancelled";
  paymentStatus?: "unpaid" | "pending" | "paid";
}): Promise<ActionResult> {
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid update." };
  }

  const update: OrderUpdate = {};
  if (parsed.data.fulfillmentStatus) update.fulfillment_status = parsed.data.fulfillmentStatus;
  if (parsed.data.paymentStatus) update.payment_status = parsed.data.paymentStatus;
  if (Object.keys(update).length === 0) {
    return { ok: false, error: "Nothing to update." };
  }

  const supabase = await createClient();
  // .select() matters: when RLS filters the row out, PostgREST answers 200
  // with no error and nothing updated. Without reading back what changed,
  // a rep whose session had gone stale was told the order was fulfilled
  // when it was still pending.
  const { data, error } = await supabase
    .from("orders")
    .update(update)
    .eq("id", parsed.data.orderId)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "That order couldn't be updated. Refresh and try again." };
  }
  return { ok: true };
}

// Rejecting is a status change plus a reason, and the two must land
// together — an order that says "rejected" with no reason is the thing this
// is meant to prevent. The database enforces that pairing too, and that
// only a pending order can be rejected, so a crafted request cannot slip
// past this action.
export async function rejectOrder(input: {
  orderId: string;
  reason: string;
}): Promise<ActionResult> {
  const parsed = rejectOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rejection." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({
      fulfillment_status: "rejected",
      rejection_reason: parsed.data.reason,
    })
    .eq("id", parsed.data.orderId)
    .eq("fulfillment_status", "pending")
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    // Either RLS filtered it out or it is no longer pending. Both mean the
    // supplier is looking at a stale screen.
    return { ok: false, error: "That order can no longer be rejected. Refresh and try again." };
  }
  return { ok: true };
}

export async function updateSupplierPrices(input: {
  frasacoPrice: number;
  copyAPrice: number;
}): Promise<ActionResult> {
  const parsed = updateRepPricesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid prices." };
  }

  const userId = await getVerifiedUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("suppliers")
    .update({
      frasaco_price: parsed.data.frasacoPrice.toFixed(2),
      copy_a_price: parsed.data.copyAPrice.toFixed(2),
      price_updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  // The market and the chart read prices from a cached list. Without this
  // they kept showing the old price for up to five minutes while the
  // database charged the new one — a student saw $2.50 and paid $3.00.
  revalidateTag(SUPPLIER_DIRECTORY_TAG);
  return { ok: true };
}

/**
 * Set the week this seller is taking orders for, from now. Every order
 * placed after this lands in it, and it moves on by itself each Saturday
 * at 1:00 PM. Orders already placed keep theirs. Confined to the seller's
 * own row by suppliers_update_own. week_set_at is sent only so the write
 * counts as a new setting even when the number is unchanged; the database
 * replaces the time with its own.
 */
export async function setCurrentWeek(week: unknown): Promise<ActionResult> {
  const parsed = currentWeekSchema.safeParse(week);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "That week isn't valid." };

  const userId = await getVerifiedUserId();
  if (!userId) return { ok: false, error: "Sign in again to change the week." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .update({ current_week: parsed.data, week_set_at: new Date().toISOString() })
    .eq("id", userId)
    .select("current_week");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "The week wasn't changed. Refresh and try again." };
  revalidatePath("/supplier");
  revalidatePath("/supplier/summary");
  return { ok: true };
}
