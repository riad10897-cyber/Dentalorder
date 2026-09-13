import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmIcon } from "./confirm-icon";
import { ShareButton } from "./share-button";

export default async function OrderConfirmedPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: order } = await supabase
    .from("orders")
    .select("id, week_number, total_price, order_items(quantity), representatives(display_name)")
    .eq("id", orderId)
    .eq("order_type", "tooth")
    .single();

  if (!order) notFound();

  const toothCount = (order.order_items ?? []).length;
  const total = Number(order.total_price);
  const repName = order.representatives?.display_name ?? "your rep";

  const shareText = `Just placed my Week ${order.week_number} tooth order on DentalOrder — ${toothCount} teeth, $${total.toFixed(2)}. 🦷`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <ConfirmIcon />
      <div className="font-heading text-[28px] font-extrabold">Order Placed!</div>
      <p className="mb-8 max-w-[260px] text-[15px] leading-relaxed text-text-muted">
        Your rep {repName} has received your Week {order.week_number} order and will confirm
        shortly.
      </p>

      <div className="mb-8 w-full rounded-card border border-border bg-surface px-8 py-5">
        <div className="mb-1.5 text-xs uppercase tracking-wide text-text-muted">Total Due</div>
        <div className="font-heading text-4xl font-extrabold text-accent">${total.toFixed(2)}</div>
      </div>

      <div className="flex w-full flex-col gap-2.5">
        <ShareButton text={shareText} />
        <Link
          href="/student"
          className="flex min-h-11 w-full items-center justify-center rounded-lg bg-accent py-4 font-heading text-base font-bold text-bg"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
