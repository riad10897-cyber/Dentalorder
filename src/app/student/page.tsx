import Link from "next/link";
import { redirect } from "next/navigation";
import { InstallCard } from "@/app/_components/install-card";
import { OrderWindow } from "./_components/order-window";
import { getStudentContext, listStudentOrders, type StudentOrderSummary } from "@/lib/student/data";
import { getSupplierDirectory } from "@/lib/supplier/directory";
import { countOrderableBySupplier } from "@/lib/products/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { StudentBottomNav } from "./_components/bottom-nav";
import { MarketList } from "./_components/market-list";
import { EmptyState, StoreIcon } from "@/app/_components/icons";
import { timeAgo } from "@/lib/time";

/**
 * Home is the market ("Paper, native").
 *
 * The first thing a student does is choose who they are buying from, so
 * that is the screen: search, the last order to repeat in one tap, then
 * every seller. Tapping a seller opens the chart at their prices.
 */
export default async function StudentHomePage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [student, suppliers, extrasCounts, orders] = await Promise.all([
    getStudentContext(userId),
    getSupplierDirectory(),
    countOrderableBySupplier(),
    listStudentOrders(userId),
  ]);
  if (!student) redirect("/sign-in");

  // A supplier who is also a student cannot buy from themselves — the
  // database refuses it — so they are not offered the option.
  const market = suppliers.filter((s) => s.id !== userId);

  // The newest order worth repeating: not a cancelled one, and only from a
  // seller who is still taking orders.
  const onMarket = new Set(market.map((s) => s.id));
  const last = orders.find((o) => o.fulfillmentStatus !== "cancelled" && onMarket.has(o.supplierId));

  // What a seller last did with one of this student's orders, while it is
  // news: there are no notifications, so the home screen says it.
  const update = orders
    .filter((o) => SELLER_MOVES.has(o.fulfillmentStatus) && Date.now() - Date.parse(o.updatedAt) < UPDATE_MS)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[7.5rem] pt-1.5">
      <h1 className="px-1 pb-2.5 pt-1 text-large-title font-bold text-ink">Market</h1>

      {market.length === 0 ? (
        <>
          <OrderWindow />
          <EmptyState native molo icon={<StoreIcon />} className="mt-4">
            No seller is taking orders yet. As soon as someone in your year starts selling, they will
            show up here.
          </EmptyState>
        </>
      ) : (
        <MarketList
          suppliers={market}
          university={student.university}
          extrasCounts={extrasCounts}
          between={
            <>
              {update && <LatestUpdate order={update} />}
              {last && <ReorderCard order={last} />}
              {orders.length === 0 && <FirstOrderSteps />}
              <OrderWindow />
            </>
          }
        />
      )}

      <InstallCard native />

      <StudentBottomNav />
    </main>
  );
}

const SELLER_MOVES = new Set(["confirmed", "fulfilled", "rejected"]);

const FIRST_ORDER_STEPS = [
  "Pick a seller below",
  "Tap the teeth you need",
  "Hold to place. You pay at pickup.",
];

/**
 * Until the first order, the whole job in three steps, with the first one
 * marked as where they are. Once there is an order, the Reorder card takes
 * this spot and the steps are never shown again.
 */
function FirstOrderSteps() {
  return (
    <section aria-label="Your first order" className="mt-4 rounded-group bg-card px-4 py-3.5">
      <p className="text-native-body font-semibold text-ink">Your first order, in 3 steps</p>
      <ol className="mt-2.5 flex flex-col gap-2">
        {FIRST_ORDER_STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3">
            <span
              aria-hidden
              className={`tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-native-caption font-semibold ${
                i === 0 ? "bg-ink text-card" : "border border-rule text-ink-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-list-secondary ${i === 0 ? "font-semibold text-ink" : "text-ink-muted"}`}>
              {step}
              {i === 0 && <span className="sr-only"> (you are here)</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
const UPDATE_MS = 48 * 60 * 60 * 1000;

/** "Maria confirmed your order · 2 h ago", one tap from the order. */
function LatestUpdate({ order }: { order: StudentOrderSummary }) {
  const name = order.supplierName.split(/\s+/)[0] || order.supplierName;
  const what =
    order.fulfillmentStatus === "confirmed"
      ? `${name} confirmed your order`
      : order.fulfillmentStatus === "fulfilled"
        ? `${name} handed over your order`
        : `${name} rejected your order`;
  return (
    <Link
      href="/student/orders"
      className="pressable mt-4 flex items-center gap-3 rounded-group bg-card px-4 py-3"
    >
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-ink" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-native-body font-semibold text-ink">{what}</span>
        <span className="block text-list-secondary text-ink-faint">{timeAgo(order.updatedAt)} · see Orders</span>
      </span>
      <svg aria-hidden className="h-3.5 w-3.5 shrink-0" fill="none" stroke="var(--chevron)" strokeWidth={2.5} strokeLinecap="round" viewBox="0 0 24 24">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

/** "6 teeth, Nitrile gloves": what the last order was, in a few words. */
function summarise(order: StudentOrderSummary): string {
  const teeth = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const parts: string[] = [];
  if (teeth > 0) parts.push(`${teeth} ${teeth === 1 ? "tooth" : "teeth"}`);
  if (order.extras.length === 1) parts.push(order.extras[0].name);
  else if (order.extras.length > 1) parts.push(`${order.extras.length} extras`);
  return parts.join(", ");
}

/**
 * The weekly habit, one tap away: the last order, and Reorder. It opens
 * that seller's chart filled with the same teeth and extras at today's
 * prices, straight onto the review.
 */
function ReorderCard({ order }: { order: StudentOrderSummary }) {
  return (
    <div className="mt-4 flex items-center gap-3.5 rounded-button bg-ink p-4 text-card">
      <div className="flex min-w-0 flex-1 flex-col gap-[0.1875rem]">
        <span className="truncate text-native-caption text-card/65">Last order · {order.supplierName}</span>
        {/* The total never truncates; the description gives way first. */}
        <span className="flex min-w-0 text-[1.25rem] font-semibold leading-tight tracking-[-0.01em]">
          <span className="truncate">{summarise(order)}</span>
          <span className="tnum shrink-0 whitespace-pre"> · ${order.totalPrice.toFixed(2)}</span>
        </span>
      </div>
      <Link
        href={`/student/order?supplier=${order.supplierId}&from=${order.id}`}
        className="flex h-9 shrink-0 items-center rounded-full bg-card px-4 text-list-secondary font-semibold text-ink transition-transform duration-[160ms] ease-[var(--ease-out)] active:scale-[0.94] motion-reduce:active:scale-100"
      >
        Reorder
      </Link>
    </div>
  );
}
