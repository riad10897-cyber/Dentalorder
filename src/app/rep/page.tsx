import { redirect } from "next/navigation";
import { getRepContext, listRepOrders, listRepStudents } from "@/lib/rep/data";
import { RepBottomNav } from "./_components/bottom-nav";
import { OrdersClient } from "./orders-client";

export default async function RepOrdersPage() {
  const rep = await getRepContext();
  if (!rep) redirect("/sign-in");

  const [orders, students] = await Promise.all([
    listRepOrders(rep.userId),
    listRepStudents(rep.userId),
  ]);

  const currentWeek = orders.reduce((max, o) => Math.max(max, o.weekNumber ?? 0), 0) || 1;
  const thisWeekOrders = orders.filter((o) => o.weekNumber === currentWeek);
  const pendingCount = orders.filter((o) => o.fulfillmentStatus === "pending").length;
  const weekRevenue = thisWeekOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  const studentsThisWeek = new Set(thisWeekOrders.map((o) => o.studentId)).size;
  const semesterTotal = orders.reduce((sum, o) => sum + o.totalPrice, 0);

  const firstName = rep.fullName.split(" ")[0] || rep.displayName;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="flex items-start justify-between px-6 pt-5">
        <div>
          <div className="text-[13px] text-text-muted">Rep Dashboard</div>
          <div className="font-heading text-[26px] font-bold">{firstName} 👋</div>
        </div>
      </div>

      <div className="mx-6 mt-5 grid grid-cols-2 gap-2.5">
        <StatCard label="Pending" value={String(pendingCount)} sub="orders total" accentBg />
        <StatCard label="Week Revenue" value={`$${weekRevenue.toFixed(0)}`} sub={`${studentsThisWeek} students ordered`} valueClass="text-accent" />
        <StatCard label="Total Students" value={String(students.length)} sub="in your group" />
        <StatCard label="Semester Total" value={`$${semesterTotal.toFixed(0)}`} sub={`week ${currentWeek} so far`} valueClass="text-accent2" />
      </div>

      <div className="mx-6 mt-4 flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] uppercase tracking-wide text-text-muted">Current Week</div>
          <div className="font-heading text-lg font-bold">
            Week <span className="text-accent">{currentWeek}</span>
          </div>
        </div>
        <div className="w-24 text-right text-[11px] text-text-muted">of 17 weeks</div>
      </div>

      <div className="px-6 pb-1 pt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Orders
      </div>

      <OrdersClient orders={orders} />

      <RepBottomNav />
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  accentBg,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  accentBg?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accentBg ? "border-accent bg-accent" : "border-border bg-surface"
      }`}
    >
      <div className={`text-[11px] uppercase tracking-wide ${accentBg ? "text-bg/60" : "text-text-muted"}`}>
        {label}
      </div>
      <div
        className={`font-heading text-2xl font-extrabold ${
          accentBg ? "text-bg" : (valueClass ?? "text-text")
        }`}
      >
        {value}
      </div>
      <div className={`mt-0.5 text-[11px] ${accentBg ? "text-bg/55" : "text-text-muted"}`}>{sub}</div>
    </div>
  );
}
