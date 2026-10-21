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
              {last && <ReorderCard order={last} />}
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
