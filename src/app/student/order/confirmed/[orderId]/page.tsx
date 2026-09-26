import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { ConfirmIcon } from "./confirm-icon";

export default async function OrderConfirmedPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, week_number, total_price, order_items(quantity), suppliers(display_name)")
    .eq("id", orderId)
    .eq("order_type", "tooth")
    .single();

  if (!order) notFound();

  const toothCount = (order.order_items ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const total = Number(order.total_price);
  const supplierName = order.suppliers?.display_name ?? "your supplier";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-14">
      <div className="flex flex-col items-center text-center">
        <ConfirmIcon />
        <h1 className="confirm-stagger font-display text-display" style={stagger(0)}>
          Order placed
        </h1>
        <p className="confirm-stagger mt-1 text-body text-ink-muted" style={stagger(1)}>
          {supplierName} has your week <span className="tnum">{order.week_number}</span> order.
        </p>
      </div>

      <section
        className="confirm-stagger mt-7 rounded-card border border-rule bg-card p-5 text-center"
        style={stagger(2)}
      >
        <p className="text-micro uppercase text-ink-faint">Total due</p>
        <p className="tnum mt-1 font-display text-figure">${total.toFixed(2)}</p>
        <p className="tnum mt-2 text-caption text-ink-muted">
          {toothCount} {toothCount === 1 ? "tooth" : "teeth"} · week {order.week_number}
        </p>
      </section>

      <div className="confirm-stagger mt-auto pt-8" style={stagger(3)}>
        <Link
          href="/student"
          className="pressable flex min-h-11 w-full items-center justify-center rounded-control bg-ink py-3 font-display text-body text-card"
        >
          Done
        </Link>
      </div>
    </main>
  );
}

function stagger(index: number): React.CSSProperties {
  return { "--stagger-index": index } as React.CSSProperties;
}
