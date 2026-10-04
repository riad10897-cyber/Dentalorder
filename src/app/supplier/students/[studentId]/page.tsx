import { PushedHeader } from "@/app/_components/settings/menu";
import { notFound, redirect } from "next/navigation";
import { countsAsLive, getSupplierContext, getStudentDetail } from "@/lib/supplier/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierBottomNav } from "../../_components/bottom-nav";
import { EmptyState, ClipboardIcon } from "@/app/_components/icons";

// Words, not colours: the palette's colours each mean one thing (a tooth
// type, or fulfilled), and none of them means "pending".
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  fulfilled: "Handed over",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export default async function SupplierStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [rep, detail] = await Promise.all([
    getSupplierContext(userId),
    getStudentDetail(userId, studentId),
  ]);
  if (!rep) redirect("/sign-in");

  const { profile, orders } = detail;
  if (!profile) notFound();

  const totalSpent = orders.filter(countsAsLive).reduce((sum, o) => sum + o.totalPrice, 0);
  const metaParts = [
    profile.university,
    profile.year_of_study ? `Year ${profile.year_of_study}` : null,
    profile.section,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <PushedHeader
        backHref="/supplier/students"
        backLabel="Back to students"
        title={profile.full_name}
        subtitle={metaParts || undefined}
      />

      <div className="mx-5 mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-card border border-rule bg-card px-4 py-3.5 text-center">
          <div className="tnum font-display text-heading text-ink">{orders.length}</div>
          <div className="mt-0.5 text-caption text-ink-muted">{orders.length === 1 ? "Order" : "Orders"}</div>
        </div>
        <div className="rounded-card border border-rule bg-card px-4 py-3.5 text-center">
          <div className="tnum font-display text-heading text-ink">${totalSpent.toFixed(2)}</div>
          <div className="mt-0.5 text-caption text-ink-muted">Total spent</div>
        </div>
      </div>

      <h2 className="px-5 pb-1.5 pt-6 text-micro uppercase text-ink-faint">Order history</h2>

      {orders.length === 0 ? (
        <EmptyState icon={<ClipboardIcon />} className="mx-5">
          This student hasn&rsquo;t placed an order yet.
        </EmptyState>
      ) : (
        <ul className="mx-5 overflow-hidden rounded-card border border-rule bg-card">
          {orders.map((order) => (
            <li key={order.id} className="border-b border-hairline px-4 py-3 last:border-none">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-body">
                  Week <span className="tnum">{order.weekNumber}</span>
                </span>
                <span className="tnum font-display text-body">${order.totalPrice.toFixed(2)}</span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-caption text-ink-muted">
                  {[
                    ...order.items.map((i) => `#${i.toothNumber}`),
                    ...order.extras.map((e) => e.name),
                  ]
                    .slice(0, 6)
                    .join(", ")}
                </span>
                <span className="shrink-0 text-caption text-ink-muted">
                  {STATUS_LABEL[order.fulfillmentStatus] ?? order.fulfillmentStatus}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SupplierBottomNav />
    </main>
  );
}
