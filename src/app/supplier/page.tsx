import { redirect } from "next/navigation";
import { getSupplierContext, listSupplierOrders, listSupplierStudents } from "@/lib/supplier/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierBottomNav } from "./_components/bottom-nav";
import { OrdersClient } from "./orders-client";
import { PendingBanner } from "./_components/pending-banner";

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

  const currentWeek = orders.reduce((max, o) => Math.max(max, o.weekNumber ?? 0), 0) || 1;
  const orderedThisWeek = new Set(
    orders.filter((o) => o.weekNumber === currentWeek).map((o) => o.studentId),
  ).size;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="px-5 pt-6">
        <p className="text-micro uppercase text-ink-faint">Week {currentWeek}</p>
        <h1 className="mt-1 font-display text-heading">
          <span className="tnum">{orderedThisWeek}</span> of{" "}
          <span className="tnum">{students.length}</span>{" "}
          {students.length === 1 ? "student has" : "students have"} ordered
        </h1>
      </header>

      {rep.status !== "active" && (
        <PendingBanner displayName={rep.displayName} />
      )}

      <OrdersClient orders={orders} />

      <SupplierBottomNav />
    </main>
  );
}
