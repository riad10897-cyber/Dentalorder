import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentContext, listStudentOrders, type StudentOrderSummary } from "@/lib/student/data";
import { SectionHeader } from "@/app/_components/section-header";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { StudentBottomNav } from "../_components/bottom-nav";
import { CancelOrderButton } from "./cancel-order-button";
import { OrderStatus } from "./order-status";
import { ExtrasLines, describeLines } from "@/app/_components/extras-lines";
import { EmptyState, ClipboardIcon } from "@/app/_components/icons";
import { UnavailableNote } from "@/app/_components/unavailable-note";

// Placed, not yet done with. A cancelled or rejected order has nothing
// left to wait for, so it reads as history rather than as in flight.
const IN_FLIGHT = new Set(["pending", "confirmed"]);

export default async function OrderHistoryPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [student, orders] = await Promise.all([
    getStudentContext(userId),
    listStudentOrders(userId),
  ]);
  if (!student) redirect("/sign-in");

  // Anything still in flight goes first — those are the ones a student
  // opens this tab to check on. Settled orders keep their newest-first
  // order underneath, so history still reads as history.
  const inFlight = orders.filter((o) => IN_FLIGHT.has(o.fulfillmentStatus));
  const settled = orders.filter((o) => !IN_FLIGHT.has(o.fulfillmentStatus));

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[7.5rem] pt-1.5">
      {/* A tab, not a page reached from somewhere — so no back arrow. */}
      <h1 className="px-1 pb-2.5 pt-1 text-large-title font-bold text-ink">Orders</h1>

      {orders.length === 0 ? (
        <EmptyState native molo icon={<ClipboardIcon />} className="mt-2">
          No orders yet. Once you place your first order, it will be listed here.
        </EmptyState>
      ) : (
        <>
          {[
            { title: "In flight", rows: inFlight },
            { title: "Finished", rows: settled },
          ].map((group) =>
            group.rows.length === 0 ? null : (
              <section key={group.title}>
                <SectionHeader>{group.title}</SectionHeader>
                <ul className="flex flex-col gap-2.5">
                  {group.rows.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </ul>
              </section>
            ),
          )}
        </>
      )}

      <StudentBottomNav />
    </main>
  );
}

function OrderCard({ order }: { order: StudentOrderSummary }) {
  const teeth = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const extrasCount = order.extras.reduce((sum, extra) => sum + extra.quantity, 0);
  const rejected = order.fulfillmentStatus === "rejected";
  const finished = !IN_FLIGHT.has(order.fulfillmentStatus);

  return (
    <li className="rounded-group bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-native-body font-semibold text-ink">{order.supplierName}</h2>
          <p className="tnum text-native-caption text-ink-faint">
            {formatDate(order.createdAt)} · {describeLines(teeth, extrasCount)}
          </p>
        </div>
        <span className="tnum shrink-0 text-[1.25rem] font-bold tracking-[-0.01em] text-ink">
          ${order.totalPrice.toFixed(2)}
        </span>
      </div>

      {order.items.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1">
          {order.items.map((item, i) => (
            <li
              key={i}
              className="tnum rounded-full px-2 py-0.5 text-native-caption font-semibold text-white"
              style={{ background: item.toothType === "frasaco" ? "var(--frasaco)" : "var(--copy-a)" }}
            >
              {item.toothNumber}
              {item.quantity > 1 ? `×${item.quantity}` : ""}
            </li>
          ))}
        </ul>
      )}

      <ExtrasLines extras={order.extras} />

      <UnavailableNote lines={order.unavailable} total={order.totalPrice} sellerName={order.supplierName} />

      {rejected && order.rejectionReason && (
        <p className="mt-3 rounded-field bg-fill-faint px-3 py-2 text-list-secondary text-ink">
          {order.rejectionReason}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t-[0.5px] border-separator pt-3">
        <OrderStatus status={order.fulfillmentStatus} supplierName={order.supplierName} />
        {/* Only once the order is finished: ordering again while it is
            still on its way would be a second order. It opens the chart
            filled with these lines at today's prices, onto the review. */}
        {finished && (
          <Link
            href={`/student/order?supplier=${order.supplierId}&from=${order.id}`}
            className="flex h-9 shrink-0 items-center rounded-full bg-ink px-4 text-list-secondary font-semibold text-card transition-transform duration-[160ms] ease-[var(--ease-out)] active:scale-[0.94] motion-reduce:active:scale-100"
          >
            Order again
          </Link>
        )}
      </div>

      {/* Pending only: the seller hasn't acted on it yet. The database
          checks again, under a lock, when it saves. */}
      {order.fulfillmentStatus === "pending" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/student/order/edit/${order.id}`}
            className="pressable flex h-11 flex-1 items-center justify-center rounded-field bg-fill px-3 text-native-body font-semibold text-ink"
          >
            Edit order
          </Link>
          <CancelOrderButton
            orderId={order.id}
            label="Cancel order"
            wrapperClassName="flex flex-1 flex-col gap-1"
            className="pressable flex h-11 w-full items-center justify-center rounded-field bg-fill px-3 text-native-body font-semibold text-ink-muted"
          />
        </div>
      )}
    </li>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
