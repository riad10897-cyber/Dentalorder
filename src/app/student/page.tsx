import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentContext, getOrderDefaults, listStudentOrders } from "@/lib/student/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import type { StudentOrderSummary } from "@/lib/student/data";
import { StudentBottomNav } from "./_components/bottom-nav";

export default async function StudentHomePage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  // One parallel batch: none of these depend on each other, they only
  // needed the user id, which is now verified locally.
  const [student, { nextWeek }, orders] = await Promise.all([
    getStudentContext(userId),
    getOrderDefaults(userId),
    listStudentOrders(userId),
  ]);
  if (!student) redirect("/sign-in");

  const recentOrders = orders.slice(0, 3);
  const lastOrder = orders[0] ?? null;
  const firstName = student.fullName.split(" ")[0] || "there";
  const weeksLeft = Math.max(0, 17 - nextWeek);

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="px-5 pt-6">
        <p className="text-small text-ink-muted">Good to see you,</p>
        <h1 className="font-display text-display">{firstName}</h1>
      </header>

      <section className="mx-5 mt-5 rounded-card border border-rule bg-card p-4">
        <p className="text-micro uppercase text-ink-faint">Semester</p>
        <p className="mt-1 font-display text-title">
          Week <span className="tnum">{nextWeek}</span> of <span className="tnum">17</span>
        </p>
        <div className="mt-3 flex gap-[2px]" aria-hidden="true">
          {Array.from({ length: 17 }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-[1px] ${
                i < nextWeek - 1 ? "bg-ink" : i === nextWeek - 1 ? "bg-ink-faint" : "bg-card-sunk"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-caption text-ink-muted">
          <span className="tnum">{weeksLeft}</span> {weeksLeft === 1 ? "week" : "weeks"} remaining
        </p>
      </section>

      <Link
        href="/student/order"
        className="pressable mx-5 mt-3 flex items-center justify-between rounded-card bg-ink px-5 py-4"
      >
        <span className="min-w-0">
          <span className="block font-display text-lead text-card">
            Place week <span className="tnum">{nextWeek}</span> order
          </span>
          <span className="mt-0.5 block truncate text-caption text-card/70">
            {lastOrder
              ? `Last time: week ${lastOrder.weekNumber}, ${describeOrder(lastOrder)}`
              : "Your first order — tap a tooth to start"}
          </span>
        </span>
        <svg
          className="ml-3 shrink-0 text-card"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>

      <div className="flex items-baseline justify-between px-5 pb-2 pt-7">
        <h2 className="text-micro uppercase text-ink-faint">Recent orders</h2>
        {orders.length > 3 && (
          <Link href="/student/orders" className="pressable text-caption underline underline-offset-2">
            See all
          </Link>
        )}
      </div>

      {recentOrders.length === 0 ? (
        <p className="mx-5 rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
          No orders yet. Your weekly orders will be listed here once you place the first one.
        </p>
      ) : (
        <ul className="mx-5 overflow-hidden rounded-card border border-rule bg-card">
          {recentOrders.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between border-b border-hairline px-4 py-3 last:border-none"
            >
              <span>
                <span className="block font-display text-body">
                  Week <span className="tnum">{order.weekNumber}</span>
                </span>
                <span className="block text-caption text-ink-muted">{describeOrder(order)}</span>
              </span>
              <span className="text-right">
                <span className="tnum block font-display text-body">
                  ${order.totalPrice.toFixed(2)}
                </span>
                <StatusTag status={order.fulfillmentStatus} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <StudentBottomNav />
    </main>
  );
}

function StatusTag({ status }: { status: string }) {
  const fulfilled = status === "fulfilled";
  return (
    <span
      className={`mt-0.5 inline-block rounded-control px-1.5 py-0.5 text-micro uppercase ${
        fulfilled ? "bg-fulfilled text-card" : "bg-card-sunk text-ink-muted"
      }`}
    >
      {status}
    </span>
  );
}

function describeOrder(order: StudentOrderSummary): string {
  const teeth = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const types = new Set(order.items.map((item) => item.toothType));
  const label =
    types.size > 1 ? "mixed" : types.has("frasaco") ? "Frasaco" : types.size ? "Copy A" : "";
  return `${teeth} ${teeth === 1 ? "tooth" : "teeth"}${label ? ` · ${label}` : ""}`;
}
