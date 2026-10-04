"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
// type-only: keeps the server-only data module out of this client bundle
import type { SupplierOrder } from "@/lib/supplier/data";
import { rejectOrder, updateOrderStatus } from "./_actions/orders";
import { haptic } from "@/lib/haptics";
import { ExtrasLines, describeLines } from "@/app/_components/extras-lines";
import { EmptyState, ClipboardIcon } from "@/app/_components/icons";

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
        <p className="mt-4 flex items-baseline justify-between gap-3 rounded-group bg-card px-4 py-3 text-list-secondary text-ink-muted">
          <span>
            <span className="tnum font-semibold text-ink">{owed.count}</span>{" "}
            {owed.count === 1 ? "order" : "orders"} handed over, not paid
          </span>
          <span className="tnum shrink-0 text-native-body font-bold text-ink">${owed.total.toFixed(2)}</span>
        </p>
      )}

      {/* Capsules, scrolling sideways if the text is set large. The -mx/px
          pair lets them scroll out to the screen edge. */}
      <div
        className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1"
        style={{ scrollbarWidth: "none" }}
        role="tablist"
        aria-label="Orders by status"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`pressable state-fade relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-list-secondary font-semibold after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${
              tab === t.key ? "bg-ink text-card" : "bg-fill text-ink"
            }`}
          >
            {t.label}
            <span className={`tnum font-normal ${tab === t.key ? "text-card/65" : "text-ink-faint"}`}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <label className="mt-3 flex h-[2.375rem] items-center gap-2 rounded-field bg-fill px-2.5 text-ink-faint">
        <svg aria-hidden width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a name or tooth number"
          aria-label="Search orders by student name or tooth number"
          className="min-w-0 flex-1 bg-transparent text-native-body text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </label>

      {filtered.length === 0 ? (
        <EmptyState native icon={<ClipboardIcon />} className="mt-3">
          {query.trim()
            ? `Nothing in ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} matches “${query.trim()}”.`
            : EMPTY[tab]}
        </EmptyState>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
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
    <li className="rounded-group bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-native-body font-semibold text-ink">{order.studentName}</h2>
          <p className="tnum text-native-caption text-ink-faint">
            Week {order.weekNumber} · {describeLines(teeth, extrasCount)}
          </p>
        </div>
        <span className="tnum shrink-0 text-[1.25rem] font-bold tracking-[-0.01em] text-ink">
          ${order.totalPrice.toFixed(2)}
        </span>
      </div>

      {unpaid && (
        // Deliberately ink, not a status colour: --fulfilled means fulfilled
        // and --frasaco means Frasaco. Neither may be borrowed to mean "owes
        // you money".
        <p className="mt-2 inline-block rounded-full border border-ink px-2 py-px text-native-caption font-semibold text-ink">
          Handed over · not paid
        </p>
      )}

      {order.items.length > 0 && (
      <ul className="mt-3 flex flex-wrap gap-1">
        {order.items.map((item, i) => (
          <li
            key={i}
            className="tnum rounded-full px-2 py-0.5 text-native-caption font-semibold text-white"
            style={{
              background: item.toothType === "frasaco" ? "var(--frasaco)" : "var(--copy-a)",
            }}
          >
            {item.toothNumber}
            {item.quantity > 1 ? `×${item.quantity}` : ""}
          </li>
        ))}
      </ul>
      )}

      <ExtrasLines extras={order.extras} />

      {order.fulfillmentStatus === "rejected" ? (
        <div className="mt-3 border-t-[0.5px] border-separator pt-3">
          <p className="text-native-caption font-semibold text-ink-faint">Rejected</p>
          {order.rejectionReason && (
            <p className="mt-1.5 rounded-field bg-fill-faint px-3 py-2 text-list-secondary text-ink">
              {order.rejectionReason}
            </p>
          )}
        </div>
      ) : rejecting ? (
        <div className="mt-3 border-t-[0.5px] border-separator pt-3">
          <label className="text-native-caption text-ink-muted" htmlFor={`reason-${order.id}`}>
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
            className="mt-1.5 min-h-11 w-full rounded-field bg-fill px-3.5 text-native-body text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-ink"
          />
          <p className="mt-1 text-native-caption text-ink-faint">The student sees this.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setRejecting(false);
                setReason("");
                setError(null);
              }}
              className={`${SECONDARY} flex-1 bg-fill text-ink-muted`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirmReject}
              className={`${PRIMARY} flex-[2]`}
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
        <p className="mt-2 text-native-caption text-ink" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

type StatusPatch = Parameters<typeof updateOrderStatus>[0];

const PRIMARY =
  "pressable min-h-11 rounded-field bg-ink px-3 text-native-body font-semibold text-card disabled:opacity-50";
// Colour left off, so each use sets its own without two utilities fighting.
const SECONDARY =
  "pressable min-h-11 rounded-field px-3 text-native-body font-semibold disabled:opacity-50";

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
    <div className="mt-3 border-t-[0.5px] border-separator pt-3">
      <div className="flex gap-2">
        {next && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onStatus(next.patch)}
            className={`${PRIMARY} flex-[2]`}
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
            className={`${SECONDARY} state-fade flex-1 whitespace-nowrap ${paid ? "bg-fill-faint text-ink-muted" : "bg-fill text-ink"}`}
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
            className={`pressable state-fade flex min-h-11 w-11 shrink-0 items-center justify-center rounded-field disabled:opacity-50 ${
              moreOpen ? "bg-ink text-card" : "bg-fill text-ink"
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
        <ul className="menu-in mt-2 overflow-hidden rounded-field bg-fill-faint">
          {more.map((item) => (
            <li key={item.label} className="border-b-[0.5px] border-separator last:border-none">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setMoreOpen(false);
                  item.onClick();
                }}
                className="pressable flex min-h-11 w-full items-center px-3.5 text-left text-native-body text-ink disabled:opacity-50"
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
