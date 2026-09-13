import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRepContext, getStudentDetail } from "@/lib/rep/data";
import { RepBottomNav } from "../../_components/bottom-nav";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-copy-a/10 text-copy-a",
  fulfilled: "bg-accent/10 text-accent",
  cancelled: "bg-white/5 text-text-muted",
};

export default async function RepStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const rep = await getRepContext();
  if (!rep) redirect("/sign-in");

  const { profile, orders } = await getStudentDetail(rep.userId, studentId);
  if (!profile) notFound();

  const totalSpent = orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const metaParts = [
    profile.university,
    profile.year_of_study ? `Year ${profile.year_of_study}` : null,
    profile.section,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="flex items-center gap-4 px-6 pt-5">
        <Link
          href="/rep/students"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
          aria-label="Back"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <div className="font-heading text-lg font-bold">{profile.full_name}</div>
          {metaParts && <div className="text-xs text-text-muted">{metaParts}</div>}
        </div>
      </div>

      <div className="mx-6 mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-lg border border-border bg-surface px-4 py-3.5 text-center">
          <div className="font-heading text-2xl font-extrabold text-accent">{orders.length}</div>
          <div className="mt-0.5 text-[11px] text-text-muted">Orders</div>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3.5 text-center">
          <div className="font-heading text-2xl font-extrabold text-accent">
            ${totalSpent.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[11px] text-text-muted">Total Spent</div>
        </div>
      </div>

      <div className="px-6 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Order History
      </div>

      {orders.length === 0 ? (
        <div className="mx-6 rounded-card border border-dashed border-border p-6 text-center text-sm text-text-muted">
          This student hasn&apos;t placed an order yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-6">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-border bg-surface px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Week {order.weekNumber}</span>
                <span className="font-heading text-sm font-bold">${order.totalPrice.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  {order.items
                    .map((i) => `#${i.toothNumber}`)
                    .slice(0, 6)
                    .join(", ")}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                    STATUS_STYLE[order.fulfillmentStatus] ?? STATUS_STYLE.pending
                  }`}
                >
                  {order.fulfillmentStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <RepBottomNav />
    </main>
  );
}
