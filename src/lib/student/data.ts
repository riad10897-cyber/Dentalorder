import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getRepDirectory } from "@/lib/reps/directory";
import type { ToothType } from "@/lib/supabase/types";

export interface StudentContext {
  userId: string;
  fullName: string;
  university: string | null;
  yearOfStudy: number | null;
  section: string | null;
  repId: string | null;
  repName: string | null;
  frasacoPrice: number;
  copyAPrice: number;
}

const DEFAULT_FRASACO_PRICE = 2.5;
const DEFAULT_COPY_A_PRICE = 1.2;

export interface AvailableRep {
  id: string;
  displayName: string;
  university: string | null;
  section: string | null;
}

// Same public list the sign-up picker uses, so it shares that cache
// rather than paying for the query again.
export async function listAvailableReps(): Promise<AvailableRep[]> {
  return getRepDirectory();
}

export async function getStudentContext(
  // Taken as an argument rather than resolved internally so a page can
  // fire this alongside its other queries in one parallel batch instead
  // of waiting for identity first.
  userId: string,
): Promise<StudentContext | null> {
  const supabase = await createClient();

  const [{ data: profile }, { data: studentRep }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, university, year_of_study, section")
      .eq("id", userId)
      .single(),
    supabase
      .from("student_reps")
      .select("rep_id, representatives(display_name, frasaco_price, copy_a_price)")
      .eq("student_id", userId)
      .maybeSingle(),
  ]);

  if (!profile) return null;

  const rep = studentRep?.representatives ?? null;

  return {
    userId,
    fullName: profile?.full_name ?? "",
    university: profile?.university ?? null,
    yearOfStudy: profile?.year_of_study ?? null,
    section: profile?.section ?? null,
    repId: studentRep?.rep_id ?? null,
    repName: rep?.display_name ?? null,
    frasacoPrice: rep ? Number(rep.frasaco_price) : DEFAULT_FRASACO_PRICE,
    copyAPrice: rep ? Number(rep.copy_a_price) : DEFAULT_COPY_A_PRICE,
  };
}

export interface OrderDefaults {
  nextWeek: number;
  lastToothType: ToothType;
}

export async function getOrderDefaults(userId: string): Promise<OrderDefaults> {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("week_number, created_at, order_items(tooth_type, quantity)")
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

  return { nextWeek, lastToothType };
}

export interface StudentOrderSummary {
  id: string;
  weekNumber: number | null;
  totalPrice: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  items: { toothNumber: number; toothType: ToothType; quantity: number }[];
}

// A cancelled order is money the student did not spend. Both the student's
// own profile and the rep's student list used to count it.
export function isSpend(order: { fulfillmentStatus: string }): boolean {
  return order.fulfillmentStatus !== "cancelled";
}

export async function listStudentOrders(userId: string): Promise<StudentOrderSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, week_number, total_price, payment_status, fulfillment_status, created_at, order_items(tooth_number, tooth_type, quantity)",
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
