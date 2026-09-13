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

const AVATAR_COLORS = [
  { bg: "bg-accent/12", text: "text-accent" },
  { bg: "bg-copy-a/12", text: "text-copy-a" },
  { bg: "bg-accent2/12", text: "text-accent2" },
  { bg: "bg-warning/12", text: "text-warning" },
];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function OrdersClient({ orders }: { orders: RepOrder[] }) {
  const [tab, setTab] = useState<Tab>("pending");
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const filtered = useMemo(() => orders.filter((o) => o.fulfillmentStatus === tab), [orders, tab]);
  const counts = useMemo(
    () => ({
      pending: orders.filter((o) => o.fulfillmentStatus === "pending").length,
      confirmed: orders.filter((o) => o.fulfillmentStatus === "confirmed").length,
      fulfilled: orders.filter((o) => o.fulfillmentStatus === "fulfilled").length,
    }),
    [orders],
  );

  const openOrder = orders.find((o) => o.id === openOrderId) ?? null;

  return (
    <>
      <div className="flex gap-2 px-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              tab === t.key
                ? "border-accent bg-accent font-bold text-bg"
                : "border-border bg-surface text-text-muted"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                tab === t.key ? "bg-bg/15 text-bg" : "bg-surface2 text-text-muted"
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mx-6 mt-4 rounded-card border border-dashed border-border p-6 text-center text-sm text-text-muted">
          {tab === "pending"
            ? "No pending orders. New orders will show up here as students place them."
            : `No ${tab} orders yet.`}
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2.5 px-6">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} onOpen={() => setOpenOrderId(order.id)} />
          ))}
        </div>
      )}

      {openOrder && <OrderDetailSheet order={openOrder} onClose={() => setOpenOrderId(null)} />}
    </>
  );
}

function OrderCard({ order, onOpen }: { order: RepOrder; onOpen: () => void }) {
  const color = colorFor(order.studentId);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runStatus(fulfillmentStatus: "confirmed" | "fulfilled") {
    startTransition(async () => {
      await updateOrderStatus({ orderId: order.id, fulfillmentStatus });
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold ${color.bg} ${color.text}`}
        >
          {initials(order.studentName)}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{order.studentName}</div>
          <div className="mt-0.5 text-xs text-text-muted">
            Week {order.weekNumber} · {order.items.length} teeth
          </div>
        </div>
        <div className="text-right">
          <div className="font-heading text-base font-bold">${order.totalPrice.toFixed(2)}</div>
        </div>
      </button>
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {order.items.map((item, i) => (
          <span
            key={i}
            className={`rounded-full px-2 py-1 text-[11px] font-medium ${
              item.toothType === "frasaco" ? "bg-accent/10 text-accent" : "bg-copy-a/10 text-copy-a"
            }`}
          >
            #{item.toothNumber} {item.toothType === "frasaco" ? "F" : "C"}
          </span>
        ))}
      </div>
      {order.fulfillmentStatus !== "fulfilled" && (
        <div className="flex border-t border-border">
          {order.fulfillmentStatus === "pending" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => runStatus("confirmed")}
                className="flex-1 py-3 font-heading text-[13px] font-bold text-copy-a disabled:opacity-50"
              >
                Confirm
              </button>
              <div className="w-px bg-border" />
            </>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => runStatus("fulfilled")}
            className="flex-1 py-3 font-heading text-[13px] font-bold text-accent disabled:opacity-50"
          >
            Mark Fulfilled
          </button>
        </div>
      )}
      {order.fulfillmentStatus === "fulfilled" && (
        <div className="border-t border-border py-3 text-center font-heading text-[13px] font-bold text-text-muted">
          Delivered
        </div>
      )}
    </div>
  );
}

function OrderDetailSheet({ order, onClose }: { order: RepOrder; onClose: () => void }) {
  const color = colorFor(order.studentId);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runUpdate(update: Parameters<typeof updateOrderStatus>[0]) {
    startTransition(async () => {
      await updateOrderStatus(update);
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/65 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface px-6 pb-10 pt-3">
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border" />
        <div className="mb-5 flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-heading text-base font-extrabold ${color.bg} ${color.text}`}
          >
            {initials(order.studentName)}
          </div>
          <div>
            <div className="font-heading text-lg font-bold">{order.studentName}</div>
            <div className="mt-0.5 text-[13px] text-text-muted">
              Week {order.weekNumber} · {order.items.length} teeth
            </div>
          </div>
        </div>

        <DetailRow label="Submitted" value={new Date(order.createdAt).toLocaleString()} />
        <DetailRow
          label="Status"
          value={
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs font-semibold">
              {capitalize(order.fulfillmentStatus)}
            </span>
          }
        />
        <DetailRow
          label="Payment"
          value={
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs font-semibold">
              {capitalize(order.paymentStatus)}
            </span>
          }
        />

        <div className="my-4">
          <div className="mb-2.5 text-xs uppercase tracking-wide text-text-muted">Order Items</div>
          {order.items.map((item, i) => (
            <div
              key={i}
              className={`mb-1.5 flex items-center justify-between rounded-lg px-3 py-2 ${
                item.toothType === "frasaco" ? "bg-accent/[0.07]" : "bg-copy-a/[0.07]"
              }`}
            >
              <div>
                <div className="font-heading text-sm font-bold">Tooth #{item.toothNumber}</div>
                <div className="text-xs text-text-muted">
                  {item.toothType === "frasaco" ? "Frasaco" : "Copy A"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-semibold">x{item.quantity}</div>
                <div className="text-[11px] text-text-muted">${item.lineTotal.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="my-4 flex items-center justify-between rounded-lg bg-surface2 px-4 py-3.5">
          <span className="text-sm font-semibold">Total Due from Student</span>
          <span className="font-heading text-xl font-extrabold text-accent">
            ${order.totalPrice.toFixed(2)}
          </span>
        </div>

        <div className="flex gap-2.5">
          {order.fulfillmentStatus === "pending" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => runUpdate({ orderId: order.id, fulfillmentStatus: "confirmed" })}
              className="min-h-11 flex-1 rounded-lg bg-copy-a/15 py-3 font-heading text-sm font-bold text-copy-a disabled:opacity-50"
            >
              Confirm
            </button>
          )}
          {order.fulfillmentStatus !== "fulfilled" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => runUpdate({ orderId: order.id, fulfillmentStatus: "fulfilled" })}
              className="min-h-11 flex-1 rounded-lg bg-accent py-3 font-heading text-sm font-bold text-bg disabled:opacity-50"
            >
              Mark Fulfilled
            </button>
          )}
        </div>

        {order.paymentStatus !== "paid" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => runUpdate({ orderId: order.id, paymentStatus: "paid" })}
            className="mt-2.5 min-h-11 w-full rounded-lg border border-border py-3 text-sm font-semibold text-text-muted disabled:opacity-50"
          >
            Mark Paid
          </button>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-none">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
