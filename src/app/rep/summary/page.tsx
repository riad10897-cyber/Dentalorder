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
      <div className="px-6 pt-5">
        <div className="text-[13px] text-text-muted">Weekly Summary</div>
        <div className="font-heading text-xl font-bold">Batch View</div>
      </div>

      <SummaryClient orders={orders} initialWeek={currentWeek} />

      <RepBottomNav />
    </main>
  );
}
