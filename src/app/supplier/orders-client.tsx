"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
// type-only: keeps the server-only data module out of this client bundle
import type { SupplierOrder } from "@/lib/supplier/data";
import { rejectOrder, removeUnavailable, updateOrderStatus } from "./_actions/orders";
import { haptic } from "@/lib/haptics";
import { ExtrasLines, describeLines } from "@/app/_components/extras-lines";
import { EmptyState, ClipboardIcon } from "@/app/_components/icons";
import { UnavailableNote } from "@/app/_components/unavailable-note";
import { totalWithout } from "@/lib/orders/unavailable";

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
  const [removing, setRemoving] = useState(false);

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
            {/* The week the order is for, and handed over in. */}
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

      <UnavailableNote lines={order.unavailable} total={order.totalPrice} />

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
      ) : removing ? (
        <RemovePanel
          order={order}
          onDone={() => {
            setRemoving(false);
            router.refresh();
          }}
          onCancel={() => setRemoving(false)}
        />
      ) : (
        <OrderActions
          order={order}
          pending={pending}
          onStatus={runStatus}
          onReject={() => setRejecting(true)}
          onRemove={() => {
            setError(null);
            setRemoving(true);
          }}
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
  onRemove,
}: {
  order: SupplierOrder;
  pending: boolean;
  onStatus: (patch: StatusPatch) => void;
  onReject: () => void;
  onRemove: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const status = order.fulfillmentStatus;
  const paid = order.paymentStatus === "paid";

  const next: { label: string; patch: StatusPatch } | null =
    status === "pending"
      ? { label: "Confirm", patch: { orderId: order.id, fulfillmentStatus: "confirmed" } }
      : status === "confirmed"
        ? { label: "Handed over", patch: { orderId: order.id, fulfillmentStatus: "fulfilled" } }
        : status === "fulfilled" && !paid
          ? { label: "Mark paid", patch: { orderId: order.id, paymentStatus: "paid" } }
          : null;

  // The paid toggle, unless "Mark paid" is already the main button.
  const showPaidToggle = !(status === "fulfilled" && !paid);

  // Taking an item off needs something left on the order afterwards.
  const lineCount = order.items.length + order.extras.length;
  const removeItem =
    (status === "pending" || status === "confirmed") && lineCount > 1
      ? [{ label: "Item not available…", onClick: onRemove }]
      : [];
  const more: { label: string; onClick: () => void }[] =
    status === "pending"
      ? [
          { label: "Mark handed over now", onClick: () => onStatus({ orderId: order.id, fulfillmentStatus: "fulfilled" }) },
          ...removeItem,
          { label: "Reject order…", onClick: onReject },
        ]
      : removeItem;

  return (
    <div className="mt-3 border-t-[0.5px] border-separator pt-3">
      <div className="flex gap-2">
        {next && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onStatus(next.patch)}
            className={`${PRIMARY} min-w-0 flex-[2_1_auto]`}
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
            className={`${SECONDARY} state-fade flex-[1_1_auto] whitespace-nowrap ${paid ? "bg-fill-faint text-ink-muted" : "bg-fill text-ink"}`}
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

/**
 * "Item not available": the seller ticks what they can't get, sees the new
 * total, and takes it off. The total shown here is the same sum the
 * database makes — the lines that stay, at the prices first charged — and
 * the database is what actually sets it.
 */
function RemovePanel({
  order,
  onDone,
  onCancel,
}: {
  order: SupplierOrder;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());

  const lines = [
    ...order.items.map((item) => ({
      lineId: item.lineId,
      label: `${item.toothNumber} ${item.toothType === "frasaco" ? "Frasaco" : "Copy A"}`,
      dot: item.toothType === "frasaco" ? "var(--frasaco)" : "var(--copy-a)",
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    ...order.extras.map((extra) => ({
      lineId: extra.lineId,
      label: extra.unit ? `${extra.name} · ${extra.unit}` : extra.name,
      dot: null,
      quantity: extra.quantity,
      lineTotal: extra.lineTotal,
    })),
  ];
  const everything = chosen.size === lines.length;
  const newTotal = totalWithout(lines, chosen);

  function toggle(lineId: string) {
    setError(null);
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await removeUnavailable({ orderId: order.id, lineIds: [...chosen] });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <div className="mt-3 border-t-[0.5px] border-separator pt-3">
      <p className="text-native-caption text-ink-muted">What isn&rsquo;t available? It comes off the order.</p>
      <ul className="mt-2 overflow-hidden rounded-field bg-fill-faint">
        {lines.map((line) => {
          const on = chosen.has(line.lineId);
          return (
            <li key={line.lineId} className="border-b-[0.5px] border-separator last:border-none">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={pending}
                onClick={() => toggle(line.lineId)}
                className="pressable flex min-h-11 w-full items-center gap-3 px-3.5 py-2 text-left disabled:opacity-50"
              >
                <span
                  aria-hidden
                  className={`state-fade flex h-[1.375rem] w-[1.375rem] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                    on ? "border-ink bg-ink text-card" : "border-rule"
                  }`}
                >
                  {on && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </span>
                <span className={`tnum flex min-w-0 flex-1 items-center gap-1.5 text-native-body ${on ? "text-ink-faint line-through" : "text-ink"}`}>
                  {line.dot && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: line.dot }} />}
                  <span className="truncate">{line.label}</span>
                  <span className="shrink-0 text-ink-faint">×{line.quantity}</span>
                </span>
                <span className="tnum shrink-0 text-list-secondary text-ink-muted">${line.lineTotal.toFixed(2)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="tnum mt-2 flex items-baseline justify-between px-1 text-list-secondary text-ink-muted" aria-live="polite">
        <span>{everything ? "At least one item has to stay." : "New total"}</span>
        {!everything && (
          <span className="text-native-body font-semibold text-ink">
            ${newTotal.toFixed(2)}
            {chosen.size > 0 && (
              <span className="ml-1.5 text-list-secondary font-normal text-ink-faint line-through">
                ${order.totalPrice.toFixed(2)}
              </span>
            )}
          </span>
        )}
      </p>
      <p className="mt-0.5 px-1 text-native-caption text-ink-faint">The student sees what was taken off and the new total.</p>

      <div className="mt-3 flex gap-2">
        <button type="button" disabled={pending} onClick={onCancel} className={`${SECONDARY} flex-1 bg-fill text-ink-muted`}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending || chosen.size === 0 || everything}
          onClick={confirm}
          className={`${PRIMARY} flex-[2]`}
        >
          {pending ? "Updating…" : "Take off"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-native-caption text-ink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
