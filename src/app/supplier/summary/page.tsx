import { redirect } from "next/navigation";
import { getSupplierContext, listSupplierOrders } from "@/lib/supplier/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierBottomNav } from "../_components/bottom-nav";
import { SummaryClient } from "./summary-client";

export default async function RepSummaryPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [rep, orders] = await Promise.all([
    getSupplierContext(userId),
    listSupplierOrders(userId),
  ]);
  if (!rep) redirect("/sign-in");
  // Saturday afternoon, right after the switch, the seller is buying for
  // the week that just closed: open on it while the new week is empty.
  const hasOrders = (week: number) => orders.some((o) => o.weekNumber === week);
  const currentWeek =
    !hasOrders(rep.currentWeek) && rep.currentWeek > 1 && hasOrders(rep.currentWeek - 1)
      ? rep.currentWeek - 1
      : rep.currentWeek;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="px-5 pt-6">
        <p className="text-micro uppercase text-ink-faint">Weekly batch</p>
        <h1 className="mt-1 font-display text-heading">What to buy</h1>
      </header>

      <SummaryClient orders={orders} initialWeek={currentWeek} />

      <SupplierBottomNav />
    </main>
  );
}
