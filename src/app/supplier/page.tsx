import { redirect } from "next/navigation";
import { InstallCard } from "@/app/_components/install-card";
import { getSupplierContext, listSupplierOrders, listSupplierStudents } from "@/lib/supplier/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierBottomNav } from "./_components/bottom-nav";
import { OrdersClient } from "./orders-client";
import { PendingBanner } from "./_components/pending-banner";
import { WeekControl } from "./_components/week-control";

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

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="px-5 pt-6">
        <h1 className="font-display text-heading">
          <span className="tnum">{orderedThisWeek}</span> of{" "}
          <span className="tnum">{students.length}</span>{" "}
          {students.length === 1 ? "student has" : "students have"} ordered this week
        </h1>
        <div className="mt-3">
          <WeekControl key={currentWeek} week={currentWeek} />
        </div>
        <p className="mt-1.5 text-caption text-ink-muted">
          New orders go into this week. Move it on when a new week starts.
        </p>
      </header>

      <InstallCard />

      {rep.status !== "active" && (
        <PendingBanner displayName={rep.displayName} />
      )}

      <OrdersClient orders={orders} />

      <SupplierBottomNav />
    </main>
  );
}
