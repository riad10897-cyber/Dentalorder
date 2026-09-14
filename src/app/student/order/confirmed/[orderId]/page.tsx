import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmIcon } from "./confirm-icon";
import { ShareButton } from "./share-button";

// What ordering used to cost the group: one semester of teeth arranged
// over 146 back-and-forth messages. The other half of the comparison is
// the student's own tap count, carried over from the order builder.
const QUESTIONS_BEFORE = 146;

export default async function OrderConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ taps?: string }>;
}) {
  const { orderId } = await params;
  const { taps } = await searchParams;
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

  const toothCount = (order.order_items ?? []).reduce((sum, item) => sum + item.quantity, 0);
  const total = Number(order.total_price);
  const repName = order.representatives?.display_name ?? "your rep";
  const tapCount = clampTaps(taps);

  const shareText = `Ordered my week ${order.week_number} teeth on DentalOrder in ${tapCount} taps.`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-14">
      <div className="flex flex-col items-center text-center">
        <ConfirmIcon />
        <h1 className="confirm-stagger font-display text-display" style={stagger(0)}>
          Order placed
        </h1>
        <p className="confirm-stagger mt-1 text-body text-ink-muted" style={stagger(1)}>
          {repName} has your week <span className="tnum">{order.week_number}</span> order.
        </p>
      </div>

      <section
        className="confirm-stagger mt-7 rounded-card border border-rule bg-card p-5 text-center"
        style={stagger(2)}
      >
        <p className="text-micro uppercase text-ink-faint">Total due</p>
        <p className="tnum mt-1 font-display text-figure">${total.toFixed(2)}</p>
        <p className="mt-2 text-caption text-ink-muted">
          You pay {repName} directly — DentalOrder never handles the money.
        </p>
        <p className="tnum mt-3 border-t border-hairline pt-3 text-caption text-ink-muted">
          {toothCount} {toothCount === 1 ? "tooth" : "teeth"} · week {order.week_number}
        </p>
      </section>

      <section
        className="confirm-stagger mt-3 rounded-card border border-rule bg-card-sunk p-5"
        style={stagger(3)}
      >
        <p className="font-display text-title">
          <span className="tnum">{tapCount}</span> {tapCount === 1 ? "tap" : "taps"} instead of{" "}
          <span className="tnum">{QUESTIONS_BEFORE}</span> questions
        </p>
        <p className="mt-1 text-small text-ink-muted">
          That is what this used to take the group over one semester.
        </p>
        <div className="mt-4">
          <ShareButton text={shareText} />
        </div>
      </section>

      <div className="confirm-stagger mt-auto pt-8" style={stagger(4)}>
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

function clampTaps(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(999, Math.max(1, Math.round(parsed)));
}
