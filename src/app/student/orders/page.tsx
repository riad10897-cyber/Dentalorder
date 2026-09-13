import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentContext, listStudentOrders } from "@/lib/student/data";
import { StudentBottomNav } from "../_components/bottom-nav";
import { ReorderButton } from "./reorder-button";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-accent2/10 text-accent2",
  confirmed: "bg-copy-a/10 text-copy-a",
  fulfilled: "bg-accent/10 text-accent",
  cancelled: "bg-white/5 text-text-muted",
};

export default async function OrderHistoryPage() {
  const student = await getStudentContext();
  if (!student) redirect("/sign-in");

  const orders = await listStudentOrders(student.userId);

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="flex items-center gap-4 px-6 pt-5">
        <Link
          href="/student"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="font-heading text-xl font-bold">Order History</div>
      </div>

      {orders.length === 0 ? (
        <div className="mx-6 mt-10 rounded-card border border-dashed border-border p-6 text-center text-sm text-text-muted">
          No orders yet. Once you place your first weekly order, it&apos;ll show up here.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2.5 px-6">
          {orders.map((order) => {
            const typeLabel =
              order.items.length > 0 &&
              order.items.every((i) => i.toothType === order.items[0].toothType)
                ? order.items[0].toothType === "frasaco"
                  ? "Frasaco"
                  : "Copy A"
                : "Mixed";
            return (
              <div
                key={order.id}
                className="flex items-center gap-3.5 rounded-lg border border-border bg-surface px-4 py-3.5"
              >
                <div className="flex-1">
                  <div className="text-[13px] font-medium">Week {order.weekNumber}</div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {order.items.length} teeth · {typeLabel}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-heading text-sm font-bold">
                      ${order.totalPrice.toFixed(2)}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                        STATUS_STYLE[order.fulfillmentStatus] ?? STATUS_STYLE.pending
                      }`}
                    >
                      {capitalize(order.fulfillmentStatus)}
                    </span>
                  </div>
                </div>
                <ReorderButton orderId={order.id} />
              </div>
            );
          })}
        </div>
      )}

      <StudentBottomNav />
    </main>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
