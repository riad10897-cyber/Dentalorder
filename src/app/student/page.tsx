import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentContext, getOrderDefaults, listStudentOrders } from "@/lib/student/data";
import { StudentBottomNav } from "./_components/bottom-nav";

export default async function StudentHomePage() {
  const student = await getStudentContext();
  if (!student) redirect("/sign-in");

  const [{ nextWeek }, orders] = await Promise.all([
    getOrderDefaults(student.userId),
    listStudentOrders(student.userId),
  ]);

  const recentOrders = orders.slice(0, 3);
  const firstName = student.fullName.split(" ")[0] || "there";
  const progressPct = Math.round((nextWeek / 17) * 100);

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="px-6 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[13px] text-text-muted">Good to see you,</div>
            <div className="font-heading text-[26px] font-bold leading-tight">{firstName} 👋</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent2 to-accent font-heading text-base font-bold text-bg">
            {initials(student.fullName)}
          </div>
        </div>
      </div>

      <div className="relative mx-6 mt-5 overflow-hidden rounded-card border border-border bg-surface p-5">
        <div className="mb-2 text-[11px] uppercase tracking-wide text-text-muted">
          Your Ordering
        </div>
        <div className="font-heading text-xl font-bold">
          Next up · Week <span className="text-accent">{nextWeek}</span>
        </div>
        <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent2 to-accent transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-2.5 flex justify-between text-xs text-text-muted">
          <span>
            <strong className="text-text">{nextWeek}</strong> of 17 weeks
          </span>
          <span>
            <strong className="text-text">{17 - nextWeek}</strong> weeks remaining
          </span>
        </div>
      </div>

      <div className="px-6 pb-3 pt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">
        This Week
      </div>
      <Link
        href="/student/order"
        className="mx-6 flex items-center justify-between rounded-card bg-accent px-6 py-[18px] shadow-[0_8px_32px_rgba(200,240,74,0.2)] active:scale-[0.98]"
      >
        <div className="flex flex-col gap-0.5">
          <div className="font-heading text-lg font-bold text-bg">Place Order</div>
          <div className="text-[13px] text-bg/60">Week {nextWeek}</div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg/15">
          <svg width="16" height="16" fill="none" stroke="#0e0e11" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      <div className="flex items-center justify-between px-6 pb-3 pt-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Recent Orders
        </span>
        {orders.length > 0 && (
          <Link href="/student/orders" className="text-xs text-accent">
            See all
          </Link>
        )}
      </div>

      {recentOrders.length === 0 ? (
        <div className="mx-6 rounded-card border border-dashed border-border p-6 text-center text-sm text-text-muted">
          No orders yet. Place your first order above — it takes under 30 seconds.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 px-6">
          {recentOrders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      )}

      <StudentBottomNav />
    </main>
  );
}

function OrderRow({
  order,
}: {
  order: Awaited<ReturnType<typeof listStudentOrders>>[number];
}) {
  const fulfilled = order.fulfillmentStatus === "fulfilled";
  const teethCount = order.items.length;
  const typeLabel =
    order.items.length > 0 && order.items.every((i) => i.toothType === order.items[0].toothType)
      ? order.items[0].toothType === "frasaco"
        ? "Frasaco"
        : "Copy A"
      : "Mixed";
  const toothList = order.items
    .map((i) => i.toothNumber)
    .slice(0, 4)
    .join(", ");

  return (
    <div className="flex items-center gap-3.5 rounded-lg border border-border bg-surface px-4 py-3.5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm ${
          fulfilled ? "bg-accent/10" : "bg-accent2/10"
        }`}
      >
        {fulfilled ? "✓" : "↻"}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-medium">Week {order.weekNumber}</div>
        <div className="mt-0.5 text-xs text-text-muted">
          {teethCount} teeth · {typeLabel} · {toothList}
        </div>
      </div>
      <div className="text-right">
        <div className="font-heading text-[15px] font-bold">${order.totalPrice.toFixed(2)}</div>
        <div
          className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[11px] ${
            fulfilled ? "bg-accent/10 text-accent" : "bg-accent2/10 text-accent2"
          }`}
        >
          {capitalize(order.fulfillmentStatus)}
        </div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
