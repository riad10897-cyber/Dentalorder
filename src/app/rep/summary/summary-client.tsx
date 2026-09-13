"use client";

import { useMemo, useState } from "react";
import type { RepOrder } from "@/lib/rep/data";

export function SummaryClient({ orders, initialWeek }: { orders: RepOrder[]; initialWeek: number }) {
  const [week, setWeek] = useState(initialWeek);

  const summary = useMemo(() => {
    const weekOrders = orders.filter((o) => o.weekNumber === week);
    const toothTotals = new Map<number, { toothType: "frasaco" | "copy_a"; quantity: number }>();
    let frasacoQty = 0;
    let frasacoTotal = 0;
    let copyAQty = 0;
    let copyATotal = 0;
    const students = new Set<string>();

    for (const order of weekOrders) {
      students.add(order.studentId);
      for (const item of order.items) {
        const existing = toothTotals.get(item.toothNumber) ?? {
          toothType: item.toothType,
          quantity: 0,
        };
        existing.quantity += item.quantity;
        toothTotals.set(item.toothNumber, existing);

        if (item.toothType === "frasaco") {
          frasacoQty += item.quantity;
          frasacoTotal += item.lineTotal;
        } else {
          copyAQty += item.quantity;
          copyATotal += item.lineTotal;
        }
      }
    }

    const rows = (type: "frasaco" | "copy_a") =>
      Array.from(toothTotals.entries())
        .filter(([, v]) => v.toothType === type)
        .map(([toothNumber, v]) => ({ toothNumber, quantity: v.quantity }))
        .sort((a, b) => b.quantity - a.quantity);

    return {
      frasacoRows: rows("frasaco"),
      frasacoQty,
      frasacoTotal,
      copyARows: rows("copy_a"),
      copyAQty,
      copyATotal,
      grandTotal: frasacoTotal + copyATotal,
      totalTeeth: frasacoQty + copyAQty,
      studentCount: students.size,
    };
  }, [orders, week]);

  return (
    <>
      <div className="mx-6 mt-5 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {Array.from({ length: 17 }, (_, i) => i + 1).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWeek(w)}
            className={`min-h-9 shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              w === week
                ? "border-accent bg-accent font-bold text-bg"
                : "border-border bg-surface text-text-muted"
            }`}
          >
            Wk {w}
          </button>
        ))}
      </div>

      <div className="px-6 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Teeth to Order This Week
      </div>

      {summary.totalTeeth === 0 ? (
        <div className="mx-6 rounded-card border border-dashed border-border p-6 text-center text-sm text-text-muted">
          No orders for week {week} yet.
        </div>
      ) : (
        <>
          {summary.frasacoRows.length > 0 && (
            <SummaryCard
              title="Frasaco Teeth"
              dotClass="bg-accent"
              rows={summary.frasacoRows}
              totalLabel="Total Frasaco"
              totalQty={summary.frasacoQty}
              totalPrice={summary.frasacoTotal}
            />
          )}
          {summary.copyARows.length > 0 && (
            <SummaryCard
              title="Copy A Teeth"
              dotClass="bg-copy-a"
              rows={summary.copyARows}
              totalLabel="Total Copy A"
              totalQty={summary.copyAQty}
              totalPrice={summary.copyATotal}
            />
          )}

          <div className="mx-6 mb-3 rounded-card border border-accent/20 bg-accent/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 text-xs uppercase tracking-wide text-text-muted">
                  Week {week} Grand Total
                </div>
                <div className="font-heading text-[28px] font-extrabold text-accent">
                  ${summary.grandTotal.toFixed(2)}
                </div>
              </div>
              <div className="text-right text-xs text-text-muted">
                <div>{summary.totalTeeth} teeth total</div>
                <div className="mt-0.5">{summary.studentCount} students</div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function SummaryCard({
  title,
  dotClass,
  rows,
  totalLabel,
  totalQty,
  totalPrice,
}: {
  title: string;
  dotClass: string;
  rows: { toothNumber: number; quantity: number }[];
  totalLabel: string;
  totalQty: number;
  totalPrice: number;
}) {
  return (
    <div className="mx-6 mb-2.5 rounded-card border border-border bg-surface p-4">
      <div className="mb-3.5 font-heading text-sm font-bold">{title}</div>
      {rows.map((row) => (
        <div
          key={row.toothNumber}
          className="flex items-center justify-between border-b border-border py-2 text-[13px] last:border-none"
        >
          <span className="flex items-center gap-2 text-text-muted">
            <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
            Tooth #{row.toothNumber}
          </span>
          <span className="font-heading text-[15px] font-bold">{row.quantity} pcs</span>
        </div>
      ))}
      <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3.5">
        <span className="text-[13px] font-semibold">{totalLabel}</span>
        <span className="font-heading text-lg font-extrabold text-accent">
          {totalQty} pcs · ${totalPrice.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
