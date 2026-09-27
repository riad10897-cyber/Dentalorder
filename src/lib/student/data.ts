import "server-only";
import { createClient } from "@/lib/supabase/server";

import type { ToothType } from "@/lib/supabase/types";

export interface StudentContext {
  userId: string;
  fullName: string;
  /** How a supplier reaches them about a handover. */
  phone: string | null;
  university: string | null;
  yearOfStudy: number | null;
  /** No longer collected at sign-up; still read for accounts that have one. */
  section: string | null;
}

export async function getStudentContext(
  // Taken as an argument rather than resolved internally so a page can
  // fire this alongside its other queries in one parallel batch instead
  // of waiting for identity first.
  userId: string,
): Promise<StudentContext | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, university, year_of_study, section")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  return {
    userId,
    fullName: profile.full_name ?? "",
    phone: profile.phone ?? null,
    university: profile.university ?? null,
    yearOfStudy: profile.year_of_study ?? null,
    section: profile.section ?? null,
  };
}

export interface OrderDefaults {
  nextWeek: number;
  lastToothType: ToothType;
  /** Who they ordered from last, so the market can put them first. */
  lastSupplierId: string | null;
}

export async function getOrderDefaults(userId: string): Promise<OrderDefaults> {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("week_number, created_at, supplier_id, order_items(tooth_type, quantity)")
    .eq("student_id", userId)
    .eq("order_type", "tooth")
    .order("created_at", { ascending: false });

  const rows = orders ?? [];

  // The first week 1–17 with no order yet. The old rule was "last week + 1,
  // capped at 17", which meant a student who had already ordered for week 17
  // was handed week 17 again and their second order landed in a week they
  // had filled, with nothing on screen saying so. It also skipped past any
  // week they had missed. 17 is the fallback only once every week is used.
  const ordered = new Set(rows.map((o) => o.week_number).filter((w): w is number => w !== null));
  let nextWeek = 17;
  for (let week = 1; week <= 17; week++) {
    if (!ordered.has(week)) {
      nextWeek = week;
      break;
    }
  }

  // The type they actually bought most of last time. Reading order_items[0]
  // asked an unordered query for "the first row", so a student whose last
  // order mixed both types got whichever row Postgres happened to return.
  const lastOrder = rows[0];
  const byType = { frasaco: 0, copy_a: 0 };
  for (const item of lastOrder?.order_items ?? []) {
    if (item.tooth_type) byType[item.tooth_type] += item.quantity;
  }
  const lastToothType: ToothType = byType.copy_a > byType.frasaco ? "copy_a" : "frasaco";

  return { nextWeek, lastToothType, lastSupplierId: lastOrder?.supplier_id ?? null };
}

export interface StudentOrderSummary {
  id: string;
  weekNumber: number | null;
  totalPrice: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  rejectionReason: string | null;
  supplierId: string;
  supplierName: string;
  createdAt: string;
  items: { toothNumber: number; toothType: ToothType; quantity: number }[];
}

// A cancelled order is money the student did not spend. Both the student's
// own profile and the rep's student list used to count it.
export function isSpend(order: { fulfillmentStatus: string }): boolean {
  return order.fulfillmentStatus !== "cancelled" && order.fulfillmentStatus !== "rejected";
}

export async function listStudentOrders(userId: string): Promise<StudentOrderSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, week_number, total_price, payment_status, fulfillment_status, rejection_reason, created_at, supplier_id, suppliers(display_name), order_items(tooth_number, tooth_type, quantity)",
    )
    .eq("student_id", userId)
    .eq("order_type", "tooth")
    .order("created_at", { ascending: false });

  return (data ?? []).map((order) => ({
    id: order.id,
    weekNumber: order.week_number,
    totalPrice: Number(order.total_price),
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    rejectionReason: order.rejection_reason,
    supplierId: order.supplier_id!,
    supplierName: order.suppliers?.display_name ?? "Unknown supplier",
    createdAt: order.created_at,
    items: (order.order_items ?? [])
      .filter((item) => item.tooth_number !== null && item.tooth_type !== null)
      .map((item) => ({
        toothNumber: item.tooth_number!,
        toothType: item.tooth_type!,
        quantity: item.quantity,
      })),
  }));
}

export interface EditableOrder {
  id: string;
  weekNumber: number;
  supplierId: string;
  totalPrice: number;
  lines: { toothNumber: number; toothType: ToothType; quantity: number; unitPrice: number }[];
}

/**
 * A pending tooth order of this student's, with what each line was bought
 * at — or null if there is no such order, it is someone else's, or it is
 * past editing. RLS already hides other students' orders and replaced
 * ones; the pending check here only decides whether to offer the screen.
 * The database makes the same decision again, under a lock, when the edit
 * is actually saved.
 */
export async function getEditableOrder(userId: string, orderId: string): Promise<EditableOrder | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, week_number, supplier_id, total_price, fulfillment_status, order_type, order_items(tooth_number, tooth_type, quantity, unit_price)")
    .eq("id", orderId)
    .eq("student_id", userId)
    .maybeSingle();

  if (!data || data.order_type !== "tooth" || data.fulfillment_status !== "pending") return null;
  if (data.week_number === null || data.supplier_id === null) return null;

  return {
    id: data.id,
    weekNumber: data.week_number,
    supplierId: data.supplier_id,
    totalPrice: Number(data.total_price),
    lines: (data.order_items ?? [])
      .filter((item) => item.tooth_number !== null && item.tooth_type !== null)
      .map((item) => ({
        toothNumber: item.tooth_number!,
        toothType: item.tooth_type!,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
      })),
  };
}
