"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
// type-only: keeps the server-only data module out of this client bundle
import type { SupplierOrder } from "@/lib/supplier/data";
import { rejectOrder, updateOrderStatus } from "./_actions/orders";
import { haptic } from "@/lib/haptics";
import { ExtrasLines, describeLines } from "@/app/_components/extras-lines";

type Tab = "pending" | "confirmed" | "fulfilled" | "rejected";
const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "fulfilled", label: "Done" },
  { key: "rejected", label: "Rejected" },
];

const EMPTY: Record<Tab, string> = {
  pending: "No pending orders. New orders appear here as students place them.",
  confirmed: "Nothing confirmed right now.",
  fulfilled: "Nothing handed over yet.",
  rejected: "You haven't rejected any orders.",
};

function handedOverUnpaid(order: SupplierOrder): boolean {
  return order.fulfillmentStatus === "fulfilled" && order.paymentStatus !== "paid";
}

export function OrdersClient({ orders }: { orders: SupplierOrder[] }) {
  const [tab, setTab] = useState<Tab>("pending");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () =>
      TABS.reduce(
        (acc, t) => {
          acc[t.key] = orders.filter((o) => o.fulfillmentStatus === t.key).length;
          return acc;
        },
        {} as Record<Tab, number>,
      ),
    [orders],
  );

  // Filters what is already on screen. Every order for this supplier is
  // loaded for the tabs and counts regardless, so searching costs nothing.
  const filtered = useMemo(() => {
    const inTab = orders.filter((o) => o.fulfillmentStatus === tab);
    const q = query.trim().toLowerCase();
    if (!q) return inTab;
    return inTab.filter(
      (o) =>
        o.studentName.toLowerCase().includes(q) ||
        o.items.some((item) => String(item.toothNumber).includes(q)) ||
        o.extras.some((extra) => extra.name.toLowerCase().includes(q)),
    );
  }, [orders, tab, query]);

  // What a supplier actually wants to know on a Sunday night, without
  // opening anything.
  const owed = useMemo(() => {
    const rows = orders.filter(handedOverUnpaid);
    return { count: rows.length, total: rows.reduce((sum, o) => sum + o.totalPrice, 0) };
  }, [orders]);

  return (
    <>
      {owed.count > 0 && (
        <p className="mx-5 mt-4 rounded-card border border-rule bg-card-sunk px-4 py-2.5 text-small text-ink">
          <span className="tnum font-display">{owed.count}</span>{" "}
          {owed.count === 1 ? "order" : "orders"} handed over, not paid ·{" "}
          <span className="tnum font-display">${owed.total.toFixed(2)}</span> outstanding
        </p>
      )}

      <div
        className="mt-4 flex gap-1.5 overflow-x-auto px-5 pb-1"
        style={{ scrollbarWidth: "none" }}
        role="tablist"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`pressable flex min-h-9 shrink-0 items-center gap-1.5 rounded-control border px-3 py-1.5 font-display text-small ${
              tab === t.key ? "border-ink bg-ink text-card" : "border-rule bg-card text-ink-muted"
            }`}
          >
            {t.label}
            <span className="tnum text-caption opacity-70">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 px-5">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a name or tooth number"
          aria-label="Search orders by student name or tooth number"
          className="min-h-11 w-full rounded-control border border-rule bg-card px-3 py-2 text-body text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mx-5 mt-4 rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
          {query.trim()
            ? `Nothing in ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} matches “${query.trim()}”.`
            : EMPTY[tab]}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5 px-5">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </ul>
      )}
    </>
  );
}

function OrderCard({ order }: { order: SupplierOrder }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function runStatus(patch: Parameters<typeof updateOrderStatus>[0]) {
    setError(null);
    // Fires on the tap, in the same frame as the button's own press
    // feedback — waiting for the round trip would land the tick after the
    // moment it is meant to confirm. Handing over and being paid are both
    // worth a haptic; confirming is a routine step along the way.
    if (patch.fulfillmentStatus === "fulfilled" || patch.paymentStatus === "paid") haptic();
    startTransition(async () => {
      const result = await updateOrderStatus(patch);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function confirmReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectOrder({ orderId: order.id, reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRejecting(false);
      setReason("");
      router.refresh();
    });
  }

  const teeth = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const extrasCount = order.extras.reduce((sum, extra) => sum + extra.quantity, 0);
  const unpaid = handedOverUnpaid(order);

  return (
    <li className="rounded-card border border-rule bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-body">{order.studentName}</h2>
          <p className="tnum font-display text-caption text-ink-muted">
            Week {order.weekNumber} · {describeLines(teeth, extrasCount)}
          </p>
        </div>
        <span className="tnum shrink-0 font-display text-lead">${order.totalPrice.toFixed(2)}</span>
      </div>

      {unpaid && (
        // Deliberately ink, not a status colour: --fulfilled means fulfilled
        // and --frasaco means Frasaco. Neither may be borrowed to mean "owes
        // you money".
        <p className="mt-2 inline-block rounded-control border border-ink px-1.5 py-0.5 text-micro uppercase text-ink">
          Handed over · not paid
        </p>
      )}

      <ul className="mt-3 flex flex-wrap gap-1">
        {order.items.map((item, i) => (
          <li
            key={i}
            className="tnum rounded-control px-1.5 py-0.5 text-caption text-card"
            style={{
              background: item.toothType === "frasaco" ? "var(--frasaco)" : "var(--copy-a)",
            }}
          >
            {item.toothNumber}
            {item.quantity > 1 ? `×${item.quantity}` : ""}
          </li>
        ))}
      </ul>

      <ExtrasLines extras={order.extras} />

      {order.fulfillmentStatus === "rejected" ? (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-micro uppercase text-ink-faint">Rejected</p>
          {order.rejectionReason && (
            <p className="mt-1 text-small text-ink-muted">{order.rejectionReason}</p>
          )}
        </div>
      ) : rejecting ? (
        <div className="mt-3 border-t border-hairline pt-3">
          <label className="text-micro uppercase text-ink-faint" htmlFor={`reason-${order.id}`}>
            Why are you rejecting this?
          </label>
          <input
            id={`reason-${order.id}`}
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={200}
            autoFocus
            placeholder="Out of stock this week"
            className="mt-1.5 min-h-11 w-full rounded-control border border-rule bg-card px-3 py-2 text-body text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
          />
          <p className="mt-1 text-caption text-ink-muted">The student sees this.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setRejecting(false);
                setReason("");
                setError(null);
              }}
              className="pressable min-h-11 flex-1 rounded-control border border-rule py-2.5 font-display text-small text-ink-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirmReject}
              className="pressable min-h-11 flex-[2] rounded-control bg-ink py-2.5 font-display text-small text-card disabled:opacity-50"
            >
              {pending ? "Rejecting…" : "Reject order"}
            </button>
          </div>
        </div>
      ) : (
        <OrderActions
          order={order}
          pending={pending}
          onStatus={runStatus}
          onReject={() => setRejecting(true)}
        />
      )}

      {error && (
        <p className="mt-2 text-caption text-ink" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

type StatusPatch = Parameters<typeof updateOrderStatus>[0];

/**
 * One obvious next step per order: Confirm, then Mark handed over, then
 * (once handed over and still owed) Mark paid. Paid sits beside it as its
 * own toggle, because it can happen in either order. Everything rarer —
 * rejecting, handing over without confirming first — waits under "More".
 */
function OrderActions({
  order,
  pending,
  onStatus,
  onReject,
}: {
  order: SupplierOrder;
  pending: boolean;
  onStatus: (patch: StatusPatch) => void;
  onReject: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const status = order.fulfillmentStatus;
  const paid = order.paymentStatus === "paid";

  const next: { label: string; patch: StatusPatch } | null =
    status === "pending"
      ? { label: "Confirm", patch: { orderId: order.id, fulfillmentStatus: "confirmed" } }
      : status === "confirmed"
        ? { label: "Mark handed over", patch: { orderId: order.id, fulfillmentStatus: "fulfilled" } }
        : status === "fulfilled" && !paid
          ? { label: "Mark paid", patch: { orderId: order.id, paymentStatus: "paid" } }
          : null;

  // The paid toggle, unless "Mark paid" is already the main button.
  const showPaidToggle = !(status === "fulfilled" && !paid);

  const more: { label: string; onClick: () => void }[] =
    status === "pending"
      ? [
          { label: "Mark handed over now", onClick: () => onStatus({ orderId: order.id, fulfillmentStatus: "fulfilled" }) },
          { label: "Reject order…", onClick: onReject },
        ]
      : [];

  return (
    <div className="mt-3 border-t border-hairline pt-3">
      <div className="flex gap-2">
        {next && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onStatus(next.patch)}
            className="pressable min-h-11 flex-[2] rounded-control bg-ink px-3 py-2.5 font-display text-small text-card disabled:opacity-50"
          >
            {next.label}
          </button>
        )}
        {showPaidToggle && (
          <button
            type="button"
            role="switch"
            aria-checked={paid}
            aria-label={paid ? "Paid. Tap to mark as not paid" : "Mark paid"}
            disabled={pending}
            onClick={() => onStatus({ orderId: order.id, paymentStatus: paid ? "unpaid" : "paid" })}
            className={`pressable min-h-11 flex-1 whitespace-nowrap rounded-control border border-rule px-3 py-2.5 font-display text-small disabled:opacity-50 ${
              paid ? "text-ink-muted" : "text-ink"
            }`}
          >
            {/* Short, so it never wraps beside the main button. Tapping it again undoes. */}
            {paid ? "Paid ✓" : "Mark paid"}
          </button>
        )}
        {more.length > 0 && (
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-label="More actions"
            disabled={pending}
            onClick={() => setMoreOpen((open) => !open)}
            className={`pressable flex min-h-11 w-11 shrink-0 items-center justify-center rounded-control border disabled:opacity-50 ${
              moreOpen ? "border-ink bg-card-sunk" : "border-rule"
            }`}
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="19" cy="12" r="1.75" />
            </svg>
          </button>
        )}
      </div>
      {moreOpen && more.length > 0 && (
        <ul className="mt-2 overflow-hidden rounded-control border border-rule bg-card-sunk">
          {more.map((item) => (
            <li key={item.label} className="border-b border-hairline last:border-none">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setMoreOpen(false);
                  item.onClick();
                }}
                className="pressable flex min-h-11 w-full items-center px-3 text-left text-small text-ink disabled:opacity-50"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
