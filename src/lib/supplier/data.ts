import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AccountStatus,
  FulfillmentStatus,
  PaymentStatus,
  SupplierKind,
  ToothType,
} from "@/lib/supabase/types";

export interface SupplierContext {
  userId: string;
  fullName: string;
  displayName: string;
  kind: SupplierKind;
  university: string | null;
  frasacoPrice: number;
  copyAPrice: number;
  /** Suppliers start pending_approval. A pending one can see the screens
   *  but takes no orders, so every screen has to say so. */
  status: AccountStatus;
}

export async function getSupplierContext(
  // As with the student context: the caller supplies the id so this can
  // run in parallel with the page's other queries.
  userId: string,
): Promise<SupplierContext | null> {
  const supabase = await createClient();

  const [{ data: profile }, { data: rep }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).single(),
    supabase
      .from("suppliers")
      .select("display_name, kind, university, frasaco_price, copy_a_price, status")
      .eq("id", userId)
      .single(),
  ]);

  if (!rep) return null;

  return {
    userId,
    fullName: profile?.full_name ?? "",
    displayName: rep.display_name,
    kind: rep.kind,
    university: rep.university,
    frasacoPrice: Number(rep.frasaco_price),
    copyAPrice: Number(rep.copy_a_price),
    status: rep.status,
  };
}

export interface SupplierOrderItem {
  toothNumber: number;
  toothType: ToothType;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SupplierOrder {
  id: string;
  weekNumber: number | null;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  rejectionReason: string | null;
  createdAt: string;
  studentId: string;
  studentName: string;
  items: SupplierOrderItem[];
}

// An order nobody is going to supply is not money owed and not teeth to
// buy. Rejected and cancelled both drop out of every total and out of the
// weekly shopping list.
export function countsAsLive(order: { fulfillmentStatus: FulfillmentStatus }): boolean {
  return order.fulfillmentStatus !== "cancelled" && order.fulfillmentStatus !== "rejected";
}

// Handed the teeth over, still not paid. This is the one a supplier needs
// on a Sunday night.
export function isOutstanding(order: {
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
}): boolean {
  return order.fulfillmentStatus === "fulfilled" && order.paymentStatus !== "paid";
}

function mapOrderRow(order: {
  id: string;
  week_number: number | null;
  total_price: string;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  rejection_reason: string | null;
  created_at: string;
  student_id: string;
  profiles: { full_name: string } | null;
  order_items:
    | {
        tooth_number: number | null;
        tooth_type: ToothType | null;
        quantity: number;
        unit_price: string;
        line_total: string;
      }[]
    | null;
}): SupplierOrder {
  return {
    id: order.id,
    weekNumber: order.week_number,
    totalPrice: Number(order.total_price),
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    rejectionReason: order.rejection_reason,
    createdAt: order.created_at,
    studentId: order.student_id,
    studentName: order.profiles?.full_name ?? "Unknown student",
    items: (order.order_items ?? [])
      .filter((item) => item.tooth_number !== null && item.tooth_type !== null)
      .map((item) => ({
        toothNumber: item.tooth_number!,
        toothType: item.tooth_type!,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
      })),
  };
}

export async function listSupplierOrders(supplierId: string): Promise<SupplierOrder[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, week_number, total_price, payment_status, fulfillment_status, rejection_reason, created_at, student_id, profiles(full_name), order_items(tooth_number, tooth_type, quantity, unit_price, line_total)",
    )
    .eq("supplier_id", supplierId)
    .eq("order_type", "tooth")
    .order("created_at", { ascending: false })
    .limit(300);

  return (data ?? []).map(mapOrderRow);
}

export interface SupplierStudent {
  studentId: string;
  fullName: string;
  university: string | null;
  yearOfStudy: number | null;
  section: string | null;
  orderCount: number;
  totalSpent: number;
  lastWeekOrdered: number | null;
}

// A supplier's customers are whoever has ordered from them. There is no
// roster any more — the binding table is gone — so the list is derived
// from the orders themselves, which also means a student who stops
// ordering stays visible for as long as their orders do.
export async function listSupplierStudents(supplierId: string): Promise<SupplierStudent[]> {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("student_id, total_price, week_number, fulfillment_status, profiles(full_name, university, year_of_study, section)")
    .eq("supplier_id", supplierId)
    .eq("order_type", "tooth");

  const byStudent = new Map<
    string,
    {
      fullName: string;
      university: string | null;
      yearOfStudy: number | null;
      section: string | null;
      count: number;
      total: number;
      lastWeek: number | null;
    }
  >();

  for (const order of orders ?? []) {
    const existing = byStudent.get(order.student_id) ?? {
      fullName: order.profiles?.full_name ?? "Unknown student",
      university: order.profiles?.university ?? null,
      yearOfStudy: order.profiles?.year_of_study ?? null,
      section: order.profiles?.section ?? null,
      count: 0,
      total: 0,
      lastWeek: null as number | null,
    };

    // A cancelled or rejected order is not an order this student placed
    // and not money they spent, but it still makes them a customer — so
    // it is filtered out of the figures rather than out of the query.
    if (countsAsLive({ fulfillmentStatus: order.fulfillment_status })) {
      existing.count += 1;
      existing.total += Number(order.total_price);
      if (
        order.week_number !== null &&
        (existing.lastWeek === null || order.week_number > existing.lastWeek)
      ) {
        existing.lastWeek = order.week_number;
      }
    }

    byStudent.set(order.student_id, existing);
  }

  return [...byStudent.entries()]
    .map(([studentId, s]) => ({
      studentId,
      fullName: s.fullName,
      university: s.university,
      yearOfStudy: s.yearOfStudy,
      section: s.section,
      orderCount: s.count,
      totalSpent: s.total,
      lastWeekOrdered: s.lastWeek,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function getStudentDetail(supplierId: string, studentId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, university, year_of_study, section")
      .eq("id", studentId)
      .single(),
    supabase
      .from("orders")
      .select(
        "id, week_number, total_price, payment_status, fulfillment_status, rejection_reason, created_at, student_id, profiles(full_name), order_items(tooth_number, tooth_type, quantity, unit_price, line_total)",
      )
      .eq("supplier_id", supplierId)
      .eq("student_id", studentId)
      .eq("order_type", "tooth")
      .order("week_number", { ascending: false }),
  ]);

  return {
    profile,
    orders: (orders ?? []).map(mapOrderRow),
  };
}
