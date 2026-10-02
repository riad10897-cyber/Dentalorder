"use client";

import { useMemo, useState } from "react";
import type { SupplierOrder } from "@/lib/supplier/data";
import { TOOTH_NAMES } from "@/lib/teeth/fdi";

type ToothType = "frasaco" | "copy_a";

export function SummaryClient({ orders, initialWeek }: { orders: SupplierOrder[]; initialWeek: number }) {
  const [week, setWeek] = useState(initialWeek);

  const summary = useMemo(() => {
    // Rejected and cancelled orders are not teeth to buy. Leaving them in
    // the batch is how a supplier ends up paying for stock nobody wanted.
    const weekOrders = orders.filter(
      (o) =>
        o.weekNumber === week &&
        o.fulfillmentStatus !== "rejected" &&
        o.fulfillmentStatus !== "cancelled",
    );
    // Keyed by tooth number AND type. Keying by number alone silently
    // merged a position ordered in both types into one row, which is
    // exactly the shopping list a rep would get wrong.
    const totals = new Map<string, { toothNumber: number; toothType: ToothType; quantity: number }>();
    const perType: Record<ToothType, { quantity: number; total: number }> = {
      frasaco: { quantity: 0, total: 0 },
      copy_a: { quantity: 0, total: 0 },
    };
    const students = new Set<string>();
    // Products keyed by product, not by name: a product renamed mid-week is
    // still one thing to pack. The label is the name on the first line.
    const extras = new Map<string, { name: string; unit: string | null; quantity: number; total: number }>();

    for (const order of weekOrders) {
      students.add(order.studentId);
      for (const extra of order.extras) {
        const existing = extras.get(extra.productId) ?? { name: extra.name, unit: extra.unit, quantity: 0, total: 0 };
        existing.quantity += extra.quantity;
        existing.total += extra.lineTotal;
        extras.set(extra.productId, existing);
      }
      for (const item of order.items) {
        const key = `${item.toothNumber}:${item.toothType}`;
        const existing = totals.get(key) ?? {
          toothNumber: item.toothNumber,
          toothType: item.toothType,
          quantity: 0,
        };
        existing.quantity += item.quantity;
        totals.set(key, existing);

        perType[item.toothType].quantity += item.quantity;
        perType[item.toothType].total += item.lineTotal;
      }
    }

    const rows = (type: ToothType) =>
      Array.from(totals.values())
        .filter((row) => row.toothType === type)
        .sort((a, b) => a.toothNumber - b.toothNumber);

    const extraRows = Array.from(extras.values()).sort((a, b) => a.name.localeCompare(b.name));
    const extrasTotal = extraRows.reduce((sum, row) => sum + row.total, 0);
    const extrasQuantity = extraRows.reduce((sum, row) => sum + row.quantity, 0);

    return {
      frasacoRows: rows("frasaco"),
      copyARows: rows("copy_a"),
      perType,
      extraRows,
      extrasTotal,
      extrasQuantity,
      grandTotal: perType.frasaco.total + perType.copy_a.total + extrasTotal,
      totalTeeth: perType.frasaco.quantity + perType.copy_a.quantity,
      studentCount: students.size,
    };
  }, [orders, week]);

  return (
    <>
      <div className="flex gap-1.5 overflow-x-auto px-5 pb-1 pt-4" style={{ scrollbarWidth: "none" }}>
        {Array.from({ length: 17 }, (_, i) => i + 1).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWeek(w)}
            aria-pressed={w === week}
            className={`pressable tnum min-h-9 shrink-0 rounded-control border px-3 py-1.5 font-display text-small ${
              w === week ? "border-ink bg-ink text-card" : "border-rule bg-card text-ink-muted"
            }`}
          >
            Wk {w}
          </button>
        ))}
      </div>

      {summary.totalTeeth === 0 && summary.extrasQuantity === 0 ? (
        <p className="mx-5 mt-5 rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
          No orders for week {week} yet.
        </p>
      ) : (
        <>
          <p className="px-5 pb-1 pt-5 text-caption text-ink-muted">
            <span className="tnum font-display">{summary.studentCount}</span>{" "}
            {summary.studentCount === 1 ? "student" : "students"} ·{" "}
            <span className="tnum font-display">{summary.totalTeeth}</span>{" "}
            {summary.totalTeeth === 1 ? "tooth" : "teeth"}
            {summary.extrasQuantity > 0 && (
              <>
                {" "}· <span className="tnum font-display">{summary.extrasQuantity}</span>{" "}
                {summary.extrasQuantity === 1 ? "extra" : "extras"}
              </>
            )}{" "}
            to buy
          </p>

          {summary.frasacoRows.length > 0 && (
            <BatchTable
              title="Frasaco"
              accent="var(--frasaco)"
              rows={summary.frasacoRows}
              quantity={summary.perType.frasaco.quantity}
              total={summary.perType.frasaco.total}
            />
          )}
          {summary.copyARows.length > 0 && (
            <BatchTable
              title="Copy A"
              accent="var(--copy-a)"
              rows={summary.copyARows}
              quantity={summary.perType.copy_a.quantity}
              total={summary.perType.copy_a.total}
            />
          )}

          {summary.extraRows.length > 0 && (
            <section className="mx-5 mt-3 overflow-hidden rounded-card border border-rule bg-card">
              <h2 className="border-b border-rule px-4 py-3 font-display text-body">Extras</h2>
              <ul>
                {summary.extraRows.map((row) => (
                  <li
                    key={row.name + (row.unit ?? "")}
                    className="flex items-baseline justify-between gap-3 border-b border-hairline px-4 py-2.5 last:border-none"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-display text-body">{row.name}</span>
                      {row.unit && <span className="ml-2 text-caption text-ink-muted">{row.unit}</span>}
                    </span>
                    <span className="tnum shrink-0 font-display text-body">×{row.quantity}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between border-t border-rule bg-card-sunk px-4 py-2.5">
                <span className="text-small text-ink-muted">
                  <span className="tnum font-display">{summary.extrasQuantity}</span>{" "}
                  {summary.extrasQuantity === 1 ? "extra" : "extras"}
                </span>
                <span className="tnum font-display text-body">${summary.extrasTotal.toFixed(2)}</span>
              </div>
            </section>
          )}

          <div className="mx-5 mt-3 flex items-center justify-between rounded-card bg-ink px-4 py-4">
            <span className="text-micro uppercase text-card/70">Week {week} total</span>
            <span className="tnum font-display text-heading text-card">
              ${summary.grandTotal.toFixed(2)}
            </span>
          </div>
        </>
      )}
    </>
  );
}

function BatchTable({
  title,
  accent,
  rows,
  quantity,
  total,
}: {
  title: string;
  accent: string;
  rows: { toothNumber: number; quantity: number }[];
  quantity: number;
  total: number;
}) {
  return (
    <section className="mx-5 mt-3 overflow-hidden rounded-card border border-rule bg-card">
      <h2 className="flex items-center gap-2 border-b border-rule px-4 py-3 font-display text-body">
        <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: accent }} />
        {title}
      </h2>
      <ul>
        {rows.map((row) => (
          <li
            key={row.toothNumber}
            className="flex items-baseline justify-between gap-3 border-b border-hairline px-4 py-2.5 last:border-none"
          >
            <span className="min-w-0">
              <span className="tnum font-display text-body">{row.toothNumber}</span>
              <span className="ml-2 text-caption text-ink-muted">
                {TOOTH_NAMES[row.toothNumber]}
              </span>
            </span>
            <span className="tnum shrink-0 font-display text-body">×{row.quantity}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t border-rule bg-card-sunk px-4 py-2.5">
        <span className="text-small text-ink-muted">
          <span className="tnum font-display">{quantity}</span> {title}{" "}
          {quantity === 1 ? "tooth" : "teeth"}
        </span>
        <span className="tnum font-display text-body">${total.toFixed(2)}</span>
      </div>
    </section>
  );
}
