"use server";

import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { updateOrderStatusSchema, updateRepPricesSchema } from "@/lib/validation/orders";
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

export async function updateRepPrices(input: {
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
    .from("representatives")
    .update({
      frasaco_price: parsed.data.frasacoPrice.toFixed(2),
      copy_a_price: parsed.data.copyAPrice.toFixed(2),
      price_updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
