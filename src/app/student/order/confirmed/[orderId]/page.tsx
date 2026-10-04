import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { ConfirmedView } from "./confirmed-view";

export default async function OrderConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ edited?: string }>;
}) {
  const [{ orderId }, { edited }] = await Promise.all([params, searchParams]);
  // Only a label: the order shown is whatever orderId is, either way.
  const wasEdit = edited === "1";
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, total_price, order_items(quantity, product_id), suppliers(display_name)")
    .eq("id", orderId)
    .eq("order_type", "tooth")
    .single();

  if (!order) notFound();

  // Teeth and extras counted apart: a box of gloves is not a tooth.
  const lines = order.order_items ?? [];
  const toothCount = lines.filter((l) => l.product_id === null).reduce((sum, l) => sum + l.quantity, 0);
  const extrasCount = lines.filter((l) => l.product_id !== null).reduce((sum, l) => sum + l.quantity, 0);
  const total = Number(order.total_price);
  const supplierName = order.suppliers?.display_name ?? "your supplier";

  return (
    <ConfirmedView
      wasEdit={wasEdit}
      supplierName={supplierName}
      toothCount={toothCount}
      extrasCount={extrasCount}
      total={total}
    />
  );
}
