import { PushedHeader } from "@/app/_components/settings/menu";
import { notFound, redirect } from "next/navigation";
import { countsAsLive, getSupplierContext, getStudentDetail } from "@/lib/supplier/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierBottomNav } from "../../_components/bottom-nav";
import { EmptyState, ClipboardIcon } from "@/app/_components/icons";
import { SectionHeader } from "@/app/_components/section-header";

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
    <main className="mx-auto min-h-dvh max-w-md pb-[7.5rem]">
      <PushedHeader
        native
        backText="Students"
        backHref="/supplier/students"
        backLabel="Back to students"
        title={profile.full_name}
      />

      <div className="px-4">
        {metaParts && <p className="px-1 pt-3 text-list-secondary text-ink-muted">{metaParts}</p>}

        <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-group bg-card">
          <div className="px-4 py-3.5 text-center">
            <div className="tnum text-[1.625rem] font-bold leading-tight tracking-[-0.015em] text-ink">{orders.length}</div>
            <div className="text-native-caption text-ink-faint">{orders.length === 1 ? "Order" : "Orders"}</div>
          </div>
          <div className="border-l-[0.5px] border-separator px-4 py-3.5 text-center">
            <div className="tnum text-[1.625rem] font-bold leading-tight tracking-[-0.015em] text-ink">
              ${totalSpent.toFixed(2)}
            </div>
            <div className="text-native-caption text-ink-faint">Total spent</div>
          </div>
        </div>

        <SectionHeader>Order history</SectionHeader>

        {orders.length === 0 ? (
          <EmptyState native icon={<ClipboardIcon />}>
            This student hasn&rsquo;t placed an order yet.
          </EmptyState>
        ) : (
          <ul className="overflow-hidden rounded-group bg-card">
            {orders.map((order) => (
              <li
                key={order.id}
                className="ml-4 border-b-[0.5px] border-separator py-3 pr-4 last:border-none"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-native-body font-semibold text-ink">
                    Week <span className="tnum">{order.weekNumber}</span>
                  </span>
                  <span className="tnum text-native-body font-semibold text-ink">${order.totalPrice.toFixed(2)}</span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-list-secondary text-ink-faint">
                    {[
                      ...order.items.map((i) => `#${i.toothNumber}`),
                      ...order.extras.map((e) => e.name),
                    ]
                      .slice(0, 6)
                      .join(", ")}
                  </span>
                  <span className="shrink-0 text-list-secondary text-ink-muted">
                    {STATUS_LABEL[order.fulfillmentStatus] ?? order.fulfillmentStatus}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SupplierBottomNav />
    </main>
  );
}
