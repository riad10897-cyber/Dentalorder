import "server-only";
import { createClient } from "@/lib/supabase/server";
import { effectiveWeek, orderingWeekIndex } from "@/lib/orders/ordering-week";
import type { AccountStatus, FulfillmentStatus, ToothType } from "@/lib/supabase/types";

/**
 * Everything the owner's overview shows, read with the owner's own
 * session. Admins can read every order, profile and seller through the
 * existing *_select_admin policies; nobody else gets past them, so this
 * returns nothing useful to anyone who isn't an admin. Read only.
 *
 * Sums are in whole cents.
 */

const cents = (amount: number) => Math.round(amount * 100);

export interface AdminOrder {
  id: string;
  createdAt: string;
  updatedAt: string;
  studentId: string;
  studentName: string;
  sellerId: string;
  sellerName: string;
  weekNumber: number | null;
  totalPrice: number;
  status: FulfillmentStatus;
  paid: boolean;
  /** The seller took something off as unavailable. */
  changed: boolean;
  /** Placed in the current ordering week (Saturday 5 PM to Saturday 5 PM). */
  thisWeek: boolean;
  teeth: { toothNumber: number; toothType: ToothType; quantity: number }[];
  extras: { name: string; quantity: number }[];
}

export interface AdminSeller {
  id: string;
  name: string;
  status: AccountStatus;
  week: number;
  ordersThisWeek: number;
  pending: number;
  unpaid: number;
  liveOrders: number;
  value: number;
}

export interface AdminStudent {
  id: string;
  name: string;
  detail: string;
  phone: string | null;
  createdAt: string;
  orders: number;
  spent: number;
  isSeller: boolean;
}

export interface AdminOverview {
  /** When this was read, so the screen can say how fresh it is. */
  readAt: string;
  week: { orders: number; value: number; students: number; pending: number; confirmed: number; handedOver: number };
  unpaidHandedOver: number;
  students: number;
  newStudents7d: number;
  orders: AdminOrder[];
  sellers: AdminSeller[];
  people: AdminStudent[];
}

/** An order the student actually wants: not cancelled, not rejected. */
export const isLive = (status: FulfillmentStatus) => status !== "cancelled" && status !== "rejected";

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();
  const now = new Date();
  const currentWeek = orderingWeekIndex(now);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: orderRows }, { data: profiles }, { data: sellers }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, created_at, updated_at, week_number, total_price, fulfillment_status, payment_status, student_id, supplier_id, unavailable_lines, profiles(full_name), suppliers(display_name), order_items(tooth_number, tooth_type, product_name, quantity)",
      )
      .eq("order_type", "tooth")
      // An edited or changed order shows once: as its latest version.
      .is("replaced_by", null)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("profiles")
      .select("id, full_name, role, phone, university, year_of_study, created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("suppliers").select("id, display_name, status, current_week, week_set_at"),
  ]);

  const sellerIds = new Set((sellers ?? []).map((s) => s.id));

  const orders: AdminOrder[] = (orderRows ?? []).map((o) => ({
    id: o.id,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    studentId: o.student_id,
    studentName: o.profiles?.full_name || "Unknown student",
    sellerId: o.supplier_id ?? "",
    sellerName: o.suppliers?.display_name ?? "Unknown seller",
    weekNumber: o.week_number,
    totalPrice: Number(o.total_price),
    status: o.fulfillment_status,
    paid: o.payment_status === "paid",
    changed: (o.unavailable_lines ?? []).length > 0,
    thisWeek: orderingWeekIndex(new Date(o.created_at)) === currentWeek,
    teeth: (o.order_items ?? [])
      .filter((i) => i.tooth_number !== null && i.tooth_type !== null)
      .map((i) => ({ toothNumber: i.tooth_number!, toothType: i.tooth_type!, quantity: i.quantity }))
      .sort((a, b) => a.toothNumber - b.toothNumber),
    extras: (o.order_items ?? [])
      .filter((i) => i.tooth_number === null)
      .map((i) => ({ name: i.product_name ?? "Product", quantity: i.quantity })),
  }));

  const live = orders.filter((o) => isLive(o.status));
  const week = live.filter((o) => o.thisWeek);
  const unpaid = (o: AdminOrder) => o.status === "fulfilled" && !o.paid;

  const sellerRows: AdminSeller[] = (sellers ?? [])
    .map((s) => {
      const theirs = live.filter((o) => o.sellerId === s.id);
      return {
        id: s.id,
        name: s.display_name,
        status: s.status,
        week: effectiveWeek(s.current_week, new Date(s.week_set_at)),
        ordersThisWeek: theirs.filter((o) => o.thisWeek).length,
        pending: theirs.filter((o) => o.status === "pending").length,
        unpaid: theirs.filter(unpaid).length,
        liveOrders: theirs.length,
        value: theirs.reduce((sum, o) => sum + cents(o.totalPrice), 0) / 100,
      };
    })
    .sort((a, b) => b.ordersThisWeek - a.ordersThisWeek || b.liveOrders - a.liveOrders);

  const byStudent = new Map<string, { orders: number; spent: number }>();
  for (const o of live) {
    const row = byStudent.get(o.studentId) ?? { orders: 0, spent: 0 };
    row.orders += 1;
    row.spent += cents(o.totalPrice);
    byStudent.set(o.studentId, row);
  }

  const people: AdminStudent[] = (profiles ?? [])
    .filter((p) => p.role !== "admin")
    .map((p) => ({
      id: p.id,
      name: p.full_name || "No name yet",
      detail: [p.university, p.year_of_study ? `Year ${p.year_of_study}` : null].filter(Boolean).join(" · "),
      phone: p.phone,
      createdAt: p.created_at,
      orders: byStudent.get(p.id)?.orders ?? 0,
      spent: (byStudent.get(p.id)?.spent ?? 0) / 100,
      isSeller: sellerIds.has(p.id),
    }));

  const students = (profiles ?? []).filter((p) => p.role === "student");

  return {
    readAt: now.toISOString(),
    week: {
      orders: week.length,
      value: week.reduce((sum, o) => sum + cents(o.totalPrice), 0) / 100,
      students: new Set(week.map((o) => o.studentId)).size,
      pending: week.filter((o) => o.status === "pending").length,
      confirmed: week.filter((o) => o.status === "confirmed").length,
      handedOver: week.filter((o) => o.status === "fulfilled").length,
    },
    unpaidHandedOver: live.filter(unpaid).length,
    students: students.length,
    newStudents7d: students.filter((p) => p.created_at >= since7d).length,
    orders,
    sellers: sellerRows,
    people,
  };
}
