"use server";

import { createClient } from "@/lib/supabase/server";
import { submitToothOrderSchema } from "@/lib/validation/orders";
import type { SubmitToothOrderItem, ToothType } from "@/lib/supabase/types";

export type SubmitResult = { orderId: string; error?: undefined } | { orderId?: undefined; error: string };

// The client sends a supplier, teeth, type and quantity — never a price. Pricing and the total are
// computed inside submit_tooth_order (a SECURITY DEFINER function) from the
// supplier's current prices — this action can't lie about money even if it
// wanted to, because it never sends any.
export async function submitToothOrder(input: {
  supplierId: string;
  weekNumber: number;
  items: { toothNumber: number; toothType: ToothType; quantity: number }[];
}): Promise<SubmitResult> {
  const parsed = submitToothOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That order isn't valid." };
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
  });

  if (error) return { error: error.message };
  return { orderId: data };
}

// "One tap" reorder: re-quotes the same teeth at the supplier's current prices
// (not the old snapshot — this is a new order) for next week.
export async function reorderOrder(orderId: string): Promise<SubmitResult> {
  const supabase = await createClient();

  const { data: oldOrder, error: fetchError } = await supabase
    .from("orders")
    .select("week_number, supplier_id, order_items(tooth_number, tooth_type, quantity)")
    .eq("id", orderId)
    .eq("order_type", "tooth")
    .single();

  if (fetchError || !oldOrder) {
    return { error: "That order couldn't be found." };
  }

  const items: SubmitToothOrderItem[] = (oldOrder.order_items ?? [])
    .filter((item) => item.tooth_number !== null && item.tooth_type !== null)
    .map((item) => ({
      tooth_number: item.tooth_number!,
      tooth_type: item.tooth_type!,
      quantity: item.quantity,
    }));

  if (items.length === 0) {
    return { error: "That order has no teeth to reorder." };
  }

  const nextWeek = Math.min((oldOrder.week_number ?? 0) + 1, 17);

  if (!oldOrder.supplier_id) {
    return { error: "That order has no supplier to reorder from." };
  }

  const { data, error } = await supabase.rpc("submit_tooth_order", {
    p_supplier_id: oldOrder.supplier_id,
    p_week_number: nextWeek,
    p_items: items,
  });

  if (error) return { error: error.message };
  return { orderId: data };
}
