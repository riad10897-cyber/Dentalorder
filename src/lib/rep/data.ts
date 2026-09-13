import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FulfillmentStatus, PaymentStatus, ToothType } from "@/lib/supabase/types";

export interface RepContext {
  userId: string;
  fullName: string;
  displayName: string;
  university: string;
  frasacoPrice: number;
  copyAPrice: number;
}

export async function getRepContext(): Promise<RepContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: rep }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("representatives")
      .select("display_name, university, frasaco_price, copy_a_price")
      .eq("id", user.id)
      .single(),
  ]);

  if (!rep) return null;

  return {
    userId: user.id,
    fullName: profile?.full_name ?? "",
    displayName: rep.display_name,
    university: rep.university,
    frasacoPrice: Number(rep.frasaco_price),
    copyAPrice: Number(rep.copy_a_price),
  };
}

export interface RepOrderItem {
  toothNumber: number;
  toothType: ToothType;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface RepOrder {
  id: string;
  weekNumber: number | null;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  createdAt: string;
  studentId: string;
  studentName: string;
  items: RepOrderItem[];
}

function mapOrderRow(order: {
  id: string;
  week_number: number | null;
  total_price: string;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
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
}): RepOrder {
  return {
    id: order.id,
    weekNumber: order.week_number,
    totalPrice: Number(order.total_price),
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
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

export async function listRepOrders(repId: string): Promise<RepOrder[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, week_number, total_price, payment_status, fulfillment_status, created_at, student_id, profiles(full_name), order_items(tooth_number, tooth_type, quantity, unit_price, line_total)",
    )
    .eq("rep_id", repId)
    .eq("order_type", "tooth")
    .order("created_at", { ascending: false })
    .limit(300);

  return (data ?? []).map(mapOrderRow);
}

export interface RepStudent {
  studentId: string;
  fullName: string;
  university: string | null;
  yearOfStudy: number | null;
  section: string | null;
  orderCount: number;
  totalSpent: number;
  lastWeekOrdered: number | null;
}

export async function listRepStudents(repId: string): Promise<RepStudent[]> {
  const supabase = await createClient();

  const [{ data: assignments }, { data: orders }] = await Promise.all([
    supabase
      .from("student_reps")
      .select("student_id, profiles(full_name, university, year_of_study, section)")
      .eq("rep_id", repId),
    supabase
      .from("orders")
      .select("student_id, total_price, week_number")
      .eq("rep_id", repId)
      .eq("order_type", "tooth"),
  ]);

  const statsByStudent = new Map<string, { count: number; total: number; lastWeek: number | null }>();
  for (const order of orders ?? []) {
    const existing = statsByStudent.get(order.student_id) ?? { count: 0, total: 0, lastWeek: null };
    existing.count += 1;
    existing.total += Number(order.total_price);
    if (order.week_number !== null && (existing.lastWeek === null || order.week_number > existing.lastWeek)) {
      existing.lastWeek = order.week_number;
    }
    statsByStudent.set(order.student_id, existing);
  }

  return (assignments ?? [])
    .map((assignment) => {
      const stats = statsByStudent.get(assignment.student_id) ?? {
        count: 0,
        total: 0,
        lastWeek: null,
      };
      return {
        studentId: assignment.student_id,
        fullName: assignment.profiles?.full_name ?? "Unknown student",
        university: assignment.profiles?.university ?? null,
        yearOfStudy: assignment.profiles?.year_of_study ?? null,
        section: assignment.profiles?.section ?? null,
        orderCount: stats.count,
        totalSpent: stats.total,
        lastWeekOrdered: stats.lastWeek,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function getStudentDetail(repId: string, studentId: string) {
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
        "id, week_number, total_price, payment_status, fulfillment_status, created_at, student_id, profiles(full_name), order_items(tooth_number, tooth_type, quantity, unit_price, line_total)",
      )
      .eq("rep_id", repId)
      .eq("student_id", studentId)
      .eq("order_type", "tooth")
      .order("week_number", { ascending: false }),
  ]);

  return {
    profile,
    orders: (orders ?? []).map(mapOrderRow),
  };
}
