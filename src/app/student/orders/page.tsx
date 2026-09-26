import { redirect } from "next/navigation";
import { getStudentContext, listStudentOrders } from "@/lib/student/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { StudentBottomNav } from "../_components/bottom-nav";
import { ReorderButton } from "./reorder-button";

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
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      {/* A tab, not a page reached from somewhere — so no back arrow. */}
      <h1 className="px-5 pt-6 font-display text-display">Orders</h1>

      {orders.length === 0 ? (
        <p className="mx-5 mt-8 rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
          No orders yet. Once you place your first weekly order, it will be listed here.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5 px-5">
          {[...inFlight, ...settled].map((order) => {
            const teeth = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const fulfilled = order.fulfillmentStatus === "fulfilled";
            const rejected = order.fulfillmentStatus === "rejected";
            const first = order.id === [...inFlight, ...settled][0]?.id;
            const startsSettled = settled.length > 0 && order.id === settled[0]?.id;
            return (
              <li key={order.id} className="contents">
                {first && inFlight.length > 0 && (
                  <h2 className="px-0.5 pb-0.5 pt-1 text-micro uppercase text-ink-faint">
                    In flight
                  </h2>
                )}
                {startsSettled && inFlight.length > 0 && (
                  <h2 className="px-0.5 pb-0.5 pt-4 text-micro uppercase text-ink-faint">
                    Finished
                  </h2>
                )}
                <div className="rounded-card border border-rule bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h2 className="font-display text-body">
                      Week <span className="tnum">{order.weekNumber}</span>
                    </h2>
                    <p className="tnum font-display text-caption text-ink-muted">
                      {formatDate(order.createdAt)} · {teeth} {teeth === 1 ? "tooth" : "teeth"}
                    </p>
                  </div>
                  <span className="tnum font-display text-lead">
                    ${order.totalPrice.toFixed(2)}
                  </span>
                </div>

                <ul className="mt-3 flex flex-wrap gap-1">
                  {order.items.map((item, i) => (
                    <li
                      key={i}
                      className="tnum rounded-control px-1.5 py-0.5 text-caption text-card"
                      style={{
                        background:
                          item.toothType === "frasaco" ? "var(--frasaco)" : "var(--copy-a)",
                      }}
                    >
                      {item.toothNumber}
                      {item.quantity > 1 ? `×${item.quantity}` : ""}
                    </li>
                  ))}
                </ul>

                {rejected && order.rejectionReason && (
                  <p className="mt-3 border-l-2 border-ink bg-card-sunk py-2 pl-3 pr-2 text-small text-ink">
                    {order.rejectionReason}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                  <span
                    className={`inline-block rounded-control px-1.5 py-0.5 text-micro uppercase ${
                      fulfilled
                        ? "bg-fulfilled text-card"
                        : rejected
                          ? "border border-ink text-ink"
                          : "bg-card-sunk text-ink-muted"
                    }`}
                  >
                    {order.fulfillmentStatus}
                  </span>
                  <ReorderButton orderId={order.id} />
                </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <StudentBottomNav />
    </main>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
