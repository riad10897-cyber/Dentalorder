import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentContext, listStudentOrders } from "@/lib/student/data";
import { StudentBottomNav } from "../_components/bottom-nav";
import { ReorderButton } from "./reorder-button";

export default async function OrderHistoryPage() {
  const student = await getStudentContext();
  if (!student) redirect("/sign-in");

  const orders = await listStudentOrders(student.userId);

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="flex items-center gap-3 px-5 pt-5">
        <Link
          href="/student"
          className="pressable -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-control"
          aria-label="Back"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-display text-title">Order history</h1>
      </div>

      {orders.length === 0 ? (
        <p className="mx-5 mt-8 rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
          No orders yet. Once you place your first weekly order, it will be listed here.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5 px-5">
          {orders.map((order) => {
            const teeth = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const fulfilled = order.fulfillmentStatus === "fulfilled";
            return (
              <li key={order.id} className="rounded-card border border-rule bg-card p-4">
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

                <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
                  <span
                    className={`inline-block rounded-control px-1.5 py-0.5 text-micro uppercase ${
                      fulfilled ? "bg-fulfilled text-card" : "bg-card-sunk text-ink-muted"
                    }`}
                  >
                    {order.fulfillmentStatus}
                  </span>
                  <ReorderButton orderId={order.id} />
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
