import { redirect } from "next/navigation";
import { getRepContext, listRepOrders } from "@/lib/rep/data";
import { RepBottomNav } from "../_components/bottom-nav";
import { SummaryClient } from "./summary-client";

export default async function RepSummaryPage() {
  const rep = await getRepContext();
  if (!rep) redirect("/sign-in");

  const orders = await listRepOrders(rep.userId);
  const currentWeek = orders.reduce((max, o) => Math.max(max, o.weekNumber ?? 0), 0) || 1;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="px-5 pt-6">
        <p className="text-micro uppercase text-ink-faint">Weekly batch</p>
        <h1 className="mt-1 font-display text-heading">What to buy</h1>
      </header>

      <SummaryClient orders={orders} initialWeek={currentWeek} />

      <RepBottomNav />
    </main>
  );
}
