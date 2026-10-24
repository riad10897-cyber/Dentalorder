"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminOrder, AdminOverview, AdminSeller, AdminStudent } from "@/lib/admin/data";
import type { FulfillmentStatus } from "@/lib/supabase/types";
import { SectionHeader } from "@/app/_components/section-header";
import { EmptyState, ClipboardIcon, PeopleIcon, StoreIcon } from "@/app/_components/icons";
import { formatDay, timeAgo } from "@/lib/time";

type Tab = "orders" | "sellers" | "students";
const TABS: { key: Tab; label: string }[] = [
  { key: "orders", label: "Orders" },
  { key: "sellers", label: "Sellers" },
  { key: "students", label: "Students" },
];

type Filter = "all" | "pending" | "confirmed" | "fulfilled" | "unpaid" | "closed";
const FILTERS: { key: Filter; label: string; test: (o: AdminOrder) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "pending", label: "Pending", test: (o) => o.status === "pending" },
  { key: "confirmed", label: "Confirmed", test: (o) => o.status === "confirmed" },
  { key: "fulfilled", label: "Handed over", test: (o) => o.status === "fulfilled" },
  { key: "unpaid", label: "Unpaid", test: (o) => o.status === "fulfilled" && !o.paid },
  { key: "closed", label: "Rejected or cancelled", test: (o) => o.status === "rejected" || o.status === "cancelled" },
];

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

const SHOW_AT_MOST = 150;

/**
 * The owner's overview ("Paper, native"): this ordering week at a glance,
 * then everything, one tab at a time — orders by day with filters and a
 * search, each seller's week, every account. Read only.
 */
export function AdminView({ data }: { data: AdminOverview }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [tab, setTab] = useState<Tab>("orders");

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-12 pt-1.5">
      <div className="flex items-end justify-between gap-3 px-1 pt-1">
        <h1 className="text-large-title font-bold text-ink">Overview</h1>
        <button
          type="button"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={refreshing}
          className="pressable mb-1.5 flex h-9 items-center rounded-full bg-fill px-3.5 text-list-secondary font-semibold text-ink disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <p className="px-1 text-native-caption text-ink-faint">Updated {timeAgo(data.readAt)}</p>

      <WeekCard data={data} />

      <div className="mt-5">
        <Segmented value={tab} onChange={setTab} />
      </div>

      {tab === "orders" && <OrdersTab orders={data.orders} />}
      {tab === "sellers" && <SellersTab sellers={data.sellers} />}
      {tab === "students" && <StudentsTab people={data.people} total={data.students} newThisWeek={data.newStudents7d} />}

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
    </main>
  );
}

/** This ordering week, Saturday 5 PM to Saturday 5 PM: the numbers that move. */
function WeekCard({ data }: { data: AdminOverview }) {
  const w = data.week;
  return (
    <section aria-label="This week" className="mt-4 rounded-button bg-ink px-4 pb-4 pt-3.5 text-card">
      <p className="text-native-caption text-card/65">This week · since Saturday 5 PM</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="tnum text-[2.25rem] font-bold leading-none tracking-[-0.02em]">
          {w.orders}
          <span className="ml-1.5 text-native-body font-semibold text-card/70">{w.orders === 1 ? "order" : "orders"}</span>
        </p>
        <p className="tnum text-[1.375rem] font-bold tracking-[-0.01em]">${w.value.toFixed(2)}</p>
      </div>
      <p className="tnum mt-0.5 text-native-caption text-card/65">
        from {w.students} {w.students === 1 ? "student" : "students"}
      </p>
      <div className="mt-3.5 grid grid-cols-4 gap-1.5">
        {[
          { label: "Pending", n: w.pending },
          { label: "Confirmed", n: w.confirmed },
          { label: "Handed over", n: w.handedOver },
          { label: "Unpaid", n: data.unpaidHandedOver },
        ].map((s) => (
          <div key={s.label} className="rounded-field bg-card/10 px-1 py-2 text-center">
            <div className="tnum text-native-body font-bold">{s.n}</div>
            <div className="whitespace-nowrap text-[0.625rem] text-card/70">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Segmented({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const index = TABS.findIndex((t) => t.key === value);
  return (
    <div role="tablist" aria-label="Show" className="relative flex h-9 rounded-track bg-fill p-0.5">
      <span
        aria-hidden
        className="absolute bottom-0.5 top-0.5 rounded-thumb bg-card shadow-thumb transition-transform duration-[320ms] ease-[var(--ease-drawer)] motion-reduce:transition-none"
        style={{ left: "0.125rem", width: "calc((100% - 0.25rem) / 3)", transform: `translateX(${index * 100}%)` }}
      />
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className="relative flex flex-1 items-center justify-center text-list-secondary font-semibold text-ink after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="mt-3 flex h-[2.375rem] items-center gap-2 rounded-field bg-fill px-2.5 text-ink-faint">
      <svg aria-hidden width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-native-body text-ink placeholder:text-ink-faint focus:outline-none"
      />
    </label>
  );
}

// ── Orders ──────────────────────────────────────────────────────────────

function OrdersTab({ orders }: { orders: AdminOrder[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, orders.filter(f.test).length])) as Record<Filter, number>,
    [orders],
  );

  const shown = useMemo(() => {
    const test = FILTERS.find((f) => f.key === filter)!.test;
    const q = query.trim().toLowerCase();
    return orders.filter(
      (o) =>
        test(o) &&
        (!q ||
          o.studentName.toLowerCase().includes(q) ||
          o.sellerName.toLowerCase().includes(q) ||
          o.teeth.some((t) => String(t.toothNumber).includes(q))),
    );
  }, [orders, filter, query]);

  // Grouped by the Beirut day each order was placed: "Today", "Yesterday", "8 Oct".
  const groups = useMemo(() => {
    const out = new Map<string, { day: string; rows: AdminOrder[]; total: number }>();
    for (const o of shown.slice(0, SHOW_AT_MOST)) {
      const day = dayLabel(o.createdAt);
      const g = out.get(day) ?? { day, rows: [], total: 0 };
      g.rows.push(o);
      g.total += Math.round(o.totalPrice * 100);
      out.set(day, g);
    }
    return [...out.values()];
  }, [shown]);

  return (
    <>
      <SearchField value={query} onChange={setQuery} placeholder="Search a student, seller or tooth" />

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }} role="tablist" aria-label="Orders by status">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`pressable state-fade relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-list-secondary font-semibold after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${
              filter === f.key ? "bg-ink text-card" : "bg-fill text-ink"
            }`}
          >
            {f.label}
            <span className={`tnum font-normal ${filter === f.key ? "text-card/65" : "text-ink-faint"}`}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState native icon={<ClipboardIcon />} className="mt-3">
          {query.trim() ? `Nothing matches “${query.trim()}”.` : "No orders here."}
        </EmptyState>
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.day}>
              <div className="mx-1 mb-1.5 mt-[1.375rem] flex items-baseline justify-between">
                <h2 className="text-native-caption uppercase tracking-[0.02em] text-ink-faint">{g.day}</h2>
                <span className="tnum text-native-caption text-ink-faint">
                  {g.rows.length} · ${(g.total / 100).toFixed(2)}
                </span>
              </div>
              <ul className="overflow-hidden rounded-group bg-card">
                {g.rows.map((o) => (
                  <OrderRow key={o.id} order={o} open={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)} />
                ))}
              </ul>
            </section>
          ))}
          {shown.length > SHOW_AT_MOST && (
            <p className="mx-1 mt-1.5 text-native-caption text-ink-faint">
              Showing the newest {SHOW_AT_MOST} of {shown.length}. Search or filter to find older ones.
            </p>
          )}
        </>
      )}
    </>
  );
}

function OrderRow({ order, open, onToggle }: { order: AdminOrder; open: boolean; onToggle: () => void }) {
  const teeth = order.teeth.reduce((sum, t) => sum + t.quantity, 0);
  const extras = order.extras.reduce((sum, e) => sum + e.quantity, 0);
  const what = [teeth ? `${teeth} ${teeth === 1 ? "tooth" : "teeth"}` : null, extras ? `${extras} ${extras === 1 ? "extra" : "extras"}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="border-b-[0.5px] border-separator last:border-none">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full flex-col gap-0.5 px-4 py-3 text-left active:bg-card-sunk">
        <span className="flex w-full items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-native-body font-semibold text-ink">{order.studentName}</span>
          <span className="tnum shrink-0 text-native-body font-semibold text-ink">${order.totalPrice.toFixed(2)}</span>
        </span>
        <span className="flex w-full items-baseline justify-between gap-3">
          <span className="tnum min-w-0 truncate text-list-secondary text-ink-faint">
            {order.sellerName} · {what || "nothing"}
          </span>
          <StatusBadge order={order} />
        </span>
      </button>
      {open && (
        <div className="menu-in px-4 pb-3">
          {order.teeth.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {order.teeth.map((t, i) => (
                <li
                  key={i}
                  className="tnum rounded-full px-2 py-0.5 text-native-caption font-semibold text-white"
                  style={{ background: t.toothType === "frasaco" ? "var(--frasaco)" : "var(--copy-a)" }}
                >
                  {t.toothNumber}
                  {t.quantity > 1 ? `×${t.quantity}` : ""}
                </li>
              ))}
            </ul>
          )}
          {order.extras.length > 0 && (
            <p className="mt-2 text-list-secondary text-ink">
              {order.extras.map((e) => `${e.name} ×${e.quantity}`).join(", ")}
            </p>
          )}
          <p className="tnum mt-2 text-native-caption text-ink-faint">
            Placed {formatDay(order.createdAt)}
            {order.weekNumber ? ` · for week ${order.weekNumber}` : ""} · last change {timeAgo(order.updatedAt)}
            {order.changed ? " · seller took items off" : ""}
          </p>
        </div>
      )}
    </li>
  );
}

function StatusBadge({ order }: { order: AdminOrder }) {
  const unpaid = order.status === "fulfilled" && !order.paid;
  const text = unpaid ? "Handed over · unpaid" : order.status === "fulfilled" && order.paid ? "Handed over · paid" : STATUS[order.status];
  // Colours keep their one job: green only for handed over.
  const tone =
    order.status === "fulfilled"
      ? "text-fulfilled"
      : order.status === "confirmed"
        ? "text-ink"
        : order.status === "pending"
          ? "text-ink-muted"
          : "text-ink-faint";
  return <span className={`shrink-0 text-native-caption font-semibold ${tone}`}>{text}</span>;
}

// ── Sellers ─────────────────────────────────────────────────────────────

function SellersTab({ sellers }: { sellers: AdminSeller[] }) {
  if (sellers.length === 0) {
    return (
      <EmptyState native icon={<StoreIcon />} className="mt-4">
        No sellers yet.
      </EmptyState>
    );
  }
  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {sellers.map((s) => (
        <section key={s.id} className="rounded-group bg-card px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="min-w-0 truncate text-native-body font-semibold text-ink">{s.name}</h2>
            <span className="tnum shrink-0 text-native-body font-semibold text-ink">${s.value.toFixed(2)}</span>
          </div>
          <p className="tnum text-native-caption text-ink-faint">
            {SELLER_STATUS[s.status] ?? s.status} · week {s.week}
          </p>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[
              { label: "This week", value: String(s.ordersThisWeek) },
              { label: "Pending", value: String(s.pending) },
              { label: "Unpaid", value: String(s.unpaid) },
              { label: "All orders", value: String(s.liveOrders) },
            ].map((m) => (
              <div key={m.label} className="rounded-field bg-fill-faint px-1 py-2 text-center">
                <div className="tnum text-native-body font-bold text-ink">{m.value}</div>
                <div className="whitespace-nowrap text-[0.625rem] text-ink-faint">{m.label}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Students ────────────────────────────────────────────────────────────

function StudentsTab({ people, total, newThisWeek }: { people: AdminStudent[]; total: number; newThisWeek: number }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "orders">("newest");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = people.filter((p) => !q || p.name.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q));
    return sort === "orders" ? [...rows].sort((a, b) => b.orders - a.orders || b.spent - a.spent) : rows;
  }, [people, query, sort]);

  const ordered = people.filter((p) => p.orders > 0).length;

  return (
    <>
      <p className="tnum mx-1 mt-3 text-list-secondary text-ink-muted">
        {total} {total === 1 ? "student" : "students"} · {ordered} ordered · +{newThisWeek} this week
      </p>
      <SearchField value={query} onChange={setQuery} placeholder="Search a name or faculty" />
      <div className="mt-3 flex gap-2">
        {([
          ["newest", "Newest"],
          ["orders", "Most orders"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={sort === key}
            onClick={() => setSort(key)}
            className={`pressable state-fade relative flex h-9 items-center rounded-full px-3.5 text-list-secondary font-semibold after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${
              sort === key ? "bg-ink text-card" : "bg-fill text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState native icon={<PeopleIcon />} className="mt-3">
          {query.trim() ? `Nobody matches “${query.trim()}”.` : "No accounts yet."}
        </EmptyState>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-group bg-card">
          {shown.slice(0, SHOW_AT_MOST).map((p) => (
            <li key={p.id} className="ml-4 flex items-center justify-between gap-3 border-b-[0.5px] border-separator py-3 pr-4 last:border-none">
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-native-body text-ink">{p.name}</span>
                  {p.isSeller && (
                    <span className="shrink-0 rounded-full border border-ink px-1.5 text-[0.6875rem] font-semibold text-ink">Seller</span>
                  )}
                </span>
                <span className="block truncate text-list-secondary text-ink-faint">
                  {[p.detail, `joined ${formatDay(p.createdAt)}`].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="tnum block text-native-body font-semibold text-ink">${p.spent.toFixed(2)}</span>
                <span className="tnum block text-native-caption text-ink-faint">
                  {p.orders} {p.orders === 1 ? "order" : "orders"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function dayLabel(iso: string): string {
  const label = timeAgo(iso);
  if (label === "yesterday") return "Yesterday";
  if (label === "just now" || label.endsWith("ago")) return "Today";
  return formatDay(iso);
}
