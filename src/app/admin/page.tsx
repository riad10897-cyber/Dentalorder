import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getAdminOverview, type AdminOrder } from "@/lib/admin/data";
import { SectionHeader } from "@/app/_components/section-header";
import { EmptyState, ClipboardIcon, PeopleIcon, StoreIcon } from "@/app/_components/icons";
import { SignOutRow } from "@/app/_components/settings/menu";
import type { FulfillmentStatus } from "@/lib/supabase/types";

// Always fresh: this is the screen the owner opens to see what is
// happening right now.
export const dynamic = "force-dynamic";

const STATUS: Record<FulfillmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  fulfilled: "Handed over",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const SELLER_STATUS: Record<string, string> = {
  active: "Taking orders",
  pending_approval: "Waiting for approval",
  suspended: "Suspended",
};

/**
 * The owner's overview: who is ordering, from whom, and what is stuck.
 * Read only — nothing here changes an order or an account. The middleware
 * lets only admins reach /admin, and the page checks again; the data is
 * read through RLS, which shows everything only to an admin.
 */
export default async function AdminPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (me?.role !== "admin") redirect("/");

  const o = await getAdminOverview();

  const stats = [
    { label: "Students", value: String(o.students), note: `+${o.newStudents7d} this week` },
    { label: "Orders", value: String(o.liveOrders), note: `${o.orders7d} in the last 7 days` },
    { label: "Order value", value: `$${o.orderValue.toFixed(2)}`, note: "Not counting rejected or cancelled" },
    { label: "Handed over, unpaid", value: String(o.unpaidHandedOver), note: `${o.rejected} rejected · ${o.cancelled} cancelled` },
  ];

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-12 pt-1.5">
      <h1 className="px-1 pt-1 text-large-title font-bold text-ink">Overview</h1>
      <p className="px-1 text-list-secondary text-ink-muted">Everything on Molaro, as of now.</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-group bg-card px-4 py-3">
            <div className="text-native-caption text-ink-faint">{s.label}</div>
            <div className="tnum text-[1.625rem] font-bold leading-tight tracking-[-0.015em] text-ink">{s.value}</div>
            <div className="tnum text-native-caption text-ink-muted">{s.note}</div>
          </div>
        ))}
      </div>

      <SectionHeader>Sellers</SectionHeader>
      {o.sellers.length === 0 ? (
        <EmptyState native icon={<StoreIcon />}>No sellers yet.</EmptyState>
      ) : (
        <ul className="overflow-hidden rounded-group bg-card">
          {o.sellers.map((s) => (
            <li key={s.id} className="ml-4 flex items-center justify-between gap-3 border-b-[0.5px] border-separator py-3 pr-4 last:border-none">
              <span className="min-w-0">
                <span className="block truncate text-native-body font-semibold text-ink">{s.name}</span>
                <span className="tnum block text-list-secondary text-ink-faint">
                  {SELLER_STATUS[s.status] ?? s.status} · week {s.week}
                  {s.pending > 0 && ` · ${s.pending} pending`}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="tnum block text-native-body font-semibold text-ink">${s.value.toFixed(2)}</span>
                <span className="tnum block text-native-caption text-ink-faint">
                  {s.liveOrders} {s.liveOrders === 1 ? "order" : "orders"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <SectionHeader>Latest orders</SectionHeader>
      {o.recentOrders.length === 0 ? (
        <EmptyState native icon={<ClipboardIcon />}>No orders yet.</EmptyState>
      ) : (
        <ul className="overflow-hidden rounded-group bg-card">
          {o.recentOrders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
      <p className="mx-1 mt-1.5 text-native-caption text-ink-faint">The 40 newest. An edited order shows once, as it is now.</p>

      <SectionHeader>New accounts</SectionHeader>
      {o.recentSignups.length === 0 ? (
        <EmptyState native icon={<PeopleIcon />}>No accounts yet.</EmptyState>
      ) : (
        <ul className="overflow-hidden rounded-group bg-card">
          {o.recentSignups.map((p) => (
            <li key={p.id} className="ml-4 flex items-baseline justify-between gap-3 border-b-[0.5px] border-separator py-3 pr-4 last:border-none">
              <span className="min-w-0">
                <span className="block truncate text-native-body text-ink">{p.name}</span>
                {p.detail && <span className="block truncate text-list-secondary text-ink-faint">{p.detail}</span>}
              </span>
              <span className="tnum shrink-0 text-list-secondary text-ink-faint">{formatDay(p.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}

      <SectionHeader>More</SectionHeader>
      <ul className="overflow-hidden rounded-group bg-card">
        <li className="ml-4 border-b-[0.5px] border-separator pr-4">
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-between gap-3 py-2.5 text-native-body text-ink"
          >
            Visits
            <span className="text-list-secondary text-ink-faint">Vercel → Analytics</span>
          </a>
        </li>
        <li className="ml-4 pr-4">
          <Link href="/student" className="flex min-h-11 items-center justify-between gap-3 py-2.5 text-native-body text-ink">
            Open the student app
            <span className="text-list-secondary text-ink-faint">Market</span>
          </Link>
        </li>
      </ul>

      <SignOutRow native />
    </main>
  );
}

function OrderRow({ order }: { order: AdminOrder }) {
  return (
    <li className="ml-4 border-b-[0.5px] border-separator py-3 pr-4 last:border-none">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-native-body text-ink">{order.studentName}</span>
        <span className="tnum shrink-0 text-native-body font-semibold text-ink">${order.totalPrice.toFixed(2)}</span>
      </div>
      <div className="tnum flex items-baseline justify-between gap-3 text-list-secondary text-ink-faint">
        <span className="min-w-0 truncate">
          {order.sellerName} · {formatDay(order.createdAt)}
          {order.weekNumber ? ` · week ${order.weekNumber}` : ""}
        </span>
        <span className="shrink-0 text-ink-muted">
          {STATUS[order.status]}
          {order.paid ? " · paid" : ""}
          {order.changed ? " · changed" : ""}
        </span>
      </div>
    </li>
  );
}

/** "10 Oct", in Beirut, so a late-night order lands on the right day. */
function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Beirut" });
}
