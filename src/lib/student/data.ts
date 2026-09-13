import "server-only";
import { createClient } from "@/lib/supabase/server";
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

export async function getStudentContext(): Promise<StudentContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: studentRep }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, university, year_of_study, section")
      .eq("id", user.id)
      .single(),
    supabase
      .from("student_reps")
      .select("rep_id, representatives(display_name, frasaco_price, copy_a_price)")
      .eq("student_id", user.id)
      .maybeSingle(),
  ]);

  const rep = studentRep?.representatives ?? null;

  return {
    userId: user.id,
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
  const { data: lastOrder } = await supabase
    .from("orders")
    .select("week_number, order_items(tooth_type)")
    .eq("student_id", userId)
    .eq("order_type", "tooth")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastWeek = lastOrder?.week_number ?? null;
  const nextWeek = lastWeek ? Math.min(lastWeek + 1, 17) : 1;
  const lastToothType: ToothType = lastOrder?.order_items?.[0]?.tooth_type ?? "frasaco";

  return { nextWeek, lastToothType };
}

export interface StudentOrderSummary {
  id: string;
  weekNumber: number | null;
  totalPrice: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  items: { toothNumber: number; toothType: ToothType }[];
}

export async function listStudentOrders(userId: string): Promise<StudentOrderSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, week_number, total_price, payment_status, fulfillment_status, created_at, order_items(tooth_number, tooth_type)",
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
      .map((item) => ({ toothNumber: item.tooth_number!, toothType: item.tooth_type! })),
  }));
}
