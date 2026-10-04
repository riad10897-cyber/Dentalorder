"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupplierOrder } from "@/lib/supplier/data";
import { TOOTH_NAMES } from "@/lib/teeth/fdi";
import { EmptyState, BoxIcon } from "@/app/_components/icons";
import { SectionHeader } from "@/app/_components/section-header";
import { handOverWeek } from "@/lib/orders/ordering-week";

type ToothType = "frasaco" | "copy_a";

export function SummaryClient({ orders, initialWeek }: { orders: SupplierOrder[]; initialWeek: number }) {
  const [week, setWeek] = useState(initialWeek);

  // Week 12's chip starts off screen; bring the opening week into view
  // once, at once (no scroll animation on a screen opened every week).
  const chips = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = chips.current;
    const chip = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (strip && chip) strip.scrollLeft = chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2;
  }, []);

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
      <div
        ref={chips}
        className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {Array.from({ length: 17 }, (_, i) => i + 1).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWeek(w)}
            aria-pressed={w === week}
            aria-label={`Week ${w} orders`}
            className={`pressable state-fade tnum relative flex h-9 shrink-0 items-center rounded-full px-3.5 text-list-secondary font-semibold after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${
              w === week ? "bg-ink text-card" : "bg-fill text-ink"
            }`}
          >
            Wk {w}
          </button>
        ))}
      </div>

      {summary.totalTeeth === 0 && summary.extrasQuantity === 0 ? (
        <EmptyState native icon={<BoxIcon />} className="mt-4">
          No orders placed in week {week} yet.
        </EmptyState>
      ) : (
        <>
          <p className="px-1 pt-3 text-list-secondary text-ink-muted">
            <span className="tnum font-semibold text-ink">{summary.studentCount}</span>{" "}
            {summary.studentCount === 1 ? "student" : "students"} ·{" "}
            <span className="tnum font-semibold text-ink">{summary.totalTeeth}</span>{" "}
            {summary.totalTeeth === 1 ? "tooth" : "teeth"}
            {summary.extrasQuantity > 0 && (
              <>
                {" "}· <span className="tnum font-semibold text-ink">{summary.extrasQuantity}</span>{" "}
                {summary.extrasQuantity === 1 ? "extra" : "extras"}
              </>
            )}{" "}
            to buy. Ordered in week <span className="tnum">{week}</span>, handed over in {handOverWeek(week)}.
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
            <section>
              <SectionHeader>Extras</SectionHeader>
              <div className="overflow-hidden rounded-group bg-card">
                <ul>
                  {summary.extraRows.map((row) => (
                    <li
                      key={row.name + (row.unit ?? "")}
                      className="ml-4 flex items-baseline justify-between gap-3 border-b-[0.5px] border-separator py-3 pr-4 last:border-none"
                    >
                      <span className="min-w-0 truncate">
                        <span className="text-native-body text-ink">{row.name}</span>
                        {row.unit && <span className="ml-2 text-list-secondary text-ink-faint">{row.unit}</span>}
                      </span>
                      <span className="tnum shrink-0 text-native-body font-semibold text-ink">×{row.quantity}</span>
                    </li>
                  ))}
                </ul>
                <TableFooter
                  label={
                    <>
                      <span className="tnum">{summary.extrasQuantity}</span>{" "}
                      {summary.extrasQuantity === 1 ? "extra" : "extras"}
                    </>
                  }
                  total={summary.extrasTotal}
                />
              </div>
            </section>
          )}

          <div className="mt-5 flex items-center justify-between rounded-button bg-ink px-4 py-4">
            <span className="text-list-secondary text-card/70">Week {week} orders total</span>
            <span className="tnum text-[1.625rem] font-bold tracking-[-0.015em] text-card">
              ${summary.grandTotal.toFixed(2)}
            </span>
          </div>
        </>
      )}
    </>
  );
}

function TableFooter({ label, total }: { label: React.ReactNode; total: number }) {
  return (
    <div className="flex items-baseline justify-between border-t-[0.5px] border-separator bg-fill-faint px-4 py-3">
      <span className="text-list-secondary text-ink-muted">{label}</span>
      <span className="tnum text-native-body font-semibold text-ink">${total.toFixed(2)}</span>
    </div>
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
    <section>
      <SectionHeader>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: accent }} />
          {title}
        </span>
      </SectionHeader>
      <div className="overflow-hidden rounded-group bg-card">
        <ul>
          {rows.map((row) => (
            <li
              key={row.toothNumber}
              className="ml-4 flex items-baseline justify-between gap-3 border-b-[0.5px] border-separator py-3 pr-4 last:border-none"
            >
              <span className="min-w-0 truncate">
                <span className="tnum text-native-body font-semibold text-ink">{row.toothNumber}</span>
                <span className="ml-2 text-list-secondary text-ink-faint">{TOOTH_NAMES[row.toothNumber]}</span>
              </span>
              <span className="tnum shrink-0 text-native-body font-semibold text-ink">×{row.quantity}</span>
            </li>
          ))}
        </ul>
        <TableFooter
          label={
            <>
              <span className="tnum">{quantity}</span> {title} {quantity === 1 ? "tooth" : "teeth"}
            </>
          }
          total={total}
        />
      </div>
    </section>
  );
}
