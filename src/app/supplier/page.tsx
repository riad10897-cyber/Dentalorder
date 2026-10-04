import { redirect } from "next/navigation";
import { InstallCard } from "@/app/_components/install-card";
import { getSupplierContext, listSupplierOrders, listSupplierStudents } from "@/lib/supplier/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierBottomNav } from "./_components/bottom-nav";
import { OrdersClient } from "./orders-client";
import { PendingBanner } from "./_components/pending-banner";
import { WeekControl } from "./_components/week-control";
import { nextSwitchLabel } from "@/lib/orders/ordering-week";

export default async function SupplierOrdersPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  // One parallel batch — the orders and students lists only ever needed
  // the supplier's id, not the whole context.
  const [rep, orders, students] = await Promise.all([
    getSupplierContext(userId),
    listSupplierOrders(userId),
    listSupplierStudents(userId),
  ]);
  if (!rep) redirect("/sign-in");

  // The seller's own week, not the newest order's: a quiet week with no
  // orders yet still reads as the week it is.
  const currentWeek = rep.currentWeek;
  const orderedThisWeek = new Set(
    orders.filter((o) => o.weekNumber === currentWeek).map((o) => o.studentId),
  ).size;

  // "Paper, native": a tab, so a large title and no back arrow.
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[7.5rem] pt-1.5">
      <h1 className="px-1 pb-2.5 pt-1 text-large-title font-bold text-ink">Orders</h1>

      <WeekControl
        key={currentWeek}
        week={currentWeek}
        nextSwitch={nextSwitchLabel()}
        footnote={
          <>
            <span className="tnum font-semibold">{orderedThisWeek}</span> of{" "}
            <span className="tnum">{students.length}</span>{" "}
            {students.length === 1 ? "student has" : "students have"} ordered this week.
          </>
        }
      />

      {rep.status !== "active" && <PendingBanner displayName={rep.displayName} />}

      <InstallCard native />

      <OrdersClient orders={orders} />

      <SupplierBottomNav />
    </main>
  );
}
