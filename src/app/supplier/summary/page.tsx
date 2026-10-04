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
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[7.5rem] pt-1.5">
      <h1 className="px-1 pb-2.5 pt-1 text-large-title font-bold text-ink">What to buy</h1>

      <SummaryClient orders={orders} initialWeek={currentWeek} />

      <SupplierBottomNav />
    </main>
  );
}
