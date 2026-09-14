"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RepOrder } from "@/lib/rep/data"; // type-only: keeps the server-only data module out of this client bundle
import { updateOrderStatus } from "./_actions/orders";

type Tab = "pending" | "confirmed" | "fulfilled";
const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "fulfilled", label: "Done" },
];

export function OrdersClient({ orders }: { orders: RepOrder[] }) {
  const [tab, setTab] = useState<Tab>("pending");

  const filtered = useMemo(() => orders.filter((o) => o.fulfillmentStatus === tab), [orders, tab]);
  const counts = useMemo(
    () => ({
      pending: orders.filter((o) => o.fulfillmentStatus === "pending").length,
      confirmed: orders.filter((o) => o.fulfillmentStatus === "confirmed").length,
      fulfilled: orders.filter((o) => o.fulfillmentStatus === "fulfilled").length,
    }),
    [orders],
  );

  return (
    <>
      <div className="mt-5 flex gap-1.5 px-5" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`pressable flex min-h-9 items-center gap-1.5 rounded-control border px-3 py-1.5 font-display text-small ${
              tab === t.key ? "border-ink bg-ink text-card" : "border-rule bg-card text-ink-muted"
            }`}
          >
            {t.label}
            <span className="tnum text-caption opacity-70">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mx-5 mt-4 rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
          {tab === "pending"
            ? "No pending orders. New orders appear here as students place them."
            : `No ${tab} orders yet.`}
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

function OrderCard({ order }: { order: RepOrder }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runStatus(fulfillmentStatus: "confirmed" | "fulfilled") {
    startTransition(async () => {
      await updateOrderStatus({ orderId: order.id, fulfillmentStatus });
      router.refresh();
    });
  }

  const teeth = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <li className="rounded-card border border-rule bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-body">{order.studentName}</h2>
          <p className="tnum font-display text-caption text-ink-muted">
            Week {order.weekNumber} · {teeth} {teeth === 1 ? "tooth" : "teeth"}
          </p>
        </div>
        <span className="tnum shrink-0 font-display text-lead">${order.totalPrice.toFixed(2)}</span>
      </div>

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

      {order.fulfillmentStatus === "fulfilled" ? (
        <p className="mt-3 border-t border-hairline pt-3 text-center text-micro uppercase text-fulfilled">
          Fulfilled
        </p>
      ) : (
        <div className="mt-3 flex gap-2 border-t border-hairline pt-3">
          {order.fulfillmentStatus === "pending" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => runStatus("confirmed")}
              className="pressable min-h-11 flex-1 rounded-control border border-rule py-2.5 font-display text-small disabled:opacity-50"
            >
              Confirm
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => runStatus("fulfilled")}
            className="pressable min-h-11 flex-1 rounded-control bg-ink py-2.5 font-display text-small text-card disabled:opacity-50"
          >
            Mark fulfilled
          </button>
        </div>
      )}
    </li>
  );
}
