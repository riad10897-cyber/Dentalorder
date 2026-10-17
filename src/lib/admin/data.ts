import "server-only";
import { createClient } from "@/lib/supabase/server";
import { effectiveWeek } from "@/lib/orders/ordering-week";
import type { AccountStatus, FulfillmentStatus } from "@/lib/supabase/types";

/**
 * Everything the owner's overview shows, read with the owner's own
 * session. Admins can read every order, profile and seller through the
 * existing *_select_admin policies; nobody else gets past them, so this
 * returns nothing useful to anyone who isn't an admin. Read only.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const cents = (amount: number) => Math.round(amount * 100);

export interface AdminOrder {
  id: string;
  createdAt: string;
  studentName: string;
  sellerName: string;
  weekNumber: number | null;
  totalPrice: number;
  status: FulfillmentStatus;
  paid: boolean;
  /** The seller took something off as unavailable. */
  changed: boolean;
}

export interface AdminSeller {
  id: string;
  name: string;
  status: AccountStatus;
  week: number;
  liveOrders: number;
  pending: number;
  value: number;
}

export interface AdminSignup {
  id: string;
  name: string;
  detail: string;
  createdAt: string;
}

export interface AdminOverview {
  students: number;
  newStudents7d: number;
  liveOrders: number;
  orders7d: number;
  orderValue: number;
  unpaidHandedOver: number;
  rejected: number;
  cancelled: number;
  sellers: AdminSeller[];
  recentOrders: AdminOrder[];
  recentSignups: AdminSignup[];
}

/** An order the student actually wants: not cancelled, not rejected. */
const isLive = (status: FulfillmentStatus) => status !== "cancelled" && status !== "rejected";

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * DAY_MS).toISOString();

  const [{ data: orders }, { data: profiles }, { data: sellers }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, created_at, week_number, total_price, fulfillment_status, payment_status, supplier_id, unavailable_lines, profiles(full_name), suppliers(display_name)",
      )
      .eq("order_type", "tooth")
      // An edited or changed order shows once: as its latest version.
      .is("replaced_by", null)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("profiles")
      .select("id, full_name, role, university, year_of_study, created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("suppliers").select("id, display_name, status, current_week, week_set_at"),
  ]);

  const rows = orders ?? [];
  const people = profiles ?? [];
  const live = rows.filter((o) => isLive(o.fulfillment_status));

  const sellerRows: AdminSeller[] = (sellers ?? [])
    .map((s) => {
      const theirs = live.filter((o) => o.supplier_id === s.id);
      return {
        id: s.id,
        name: s.display_name,
        status: s.status,
        week: effectiveWeek(s.current_week, new Date(s.week_set_at)),
        liveOrders: theirs.length,
        pending: theirs.filter((o) => o.fulfillment_status === "pending").length,
        value: theirs.reduce((sum, o) => sum + cents(Number(o.total_price)), 0) / 100,
      };
    })
    .sort((a, b) => b.liveOrders - a.liveOrders);

  const students = people.filter((p) => p.role === "student");

  return {
    students: students.length,
    newStudents7d: students.filter((p) => p.created_at >= since).length,
    liveOrders: live.length,
    orders7d: live.filter((o) => o.created_at >= since).length,
    orderValue: live.reduce((sum, o) => sum + cents(Number(o.total_price)), 0) / 100,
    unpaidHandedOver: rows.filter((o) => o.fulfillment_status === "fulfilled" && o.payment_status !== "paid").length,
    rejected: rows.filter((o) => o.fulfillment_status === "rejected").length,
    cancelled: rows.filter((o) => o.fulfillment_status === "cancelled").length,
    sellers: sellerRows,
    recentOrders: rows.slice(0, 40).map((o) => ({
      id: o.id,
      createdAt: o.created_at,
      studentName: o.profiles?.full_name || "Unknown student",
      sellerName: o.suppliers?.display_name ?? "Unknown seller",
      weekNumber: o.week_number,
      totalPrice: Number(o.total_price),
      status: o.fulfillment_status,
      paid: o.payment_status === "paid",
      changed: (o.unavailable_lines ?? []).length > 0,
    })),
    recentSignups: people.slice(0, 15).map((p) => ({
      id: p.id,
      name: p.full_name || "No name yet",
      detail: [p.university, p.year_of_study ? `Year ${p.year_of_study}` : null].filter(Boolean).join(" · "),
      createdAt: p.created_at,
    })),
  };
}
