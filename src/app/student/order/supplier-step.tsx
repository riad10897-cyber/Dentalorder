"use client";

import { useState } from "react";
import { SupplierList } from "@/app/_components/supplier-list";
import { OrderBuilder } from "./order-builder";
import type { DirectorySupplier } from "@/lib/supplier/directory";
import type { ToothType } from "@/lib/supabase/types";

/**
 * Choose who you are buying from, then the chart opens.
 *
 * Students used to be bound to one representative and the chart opened
 * straight onto that person's prices. There is no binding any more, so the
 * supplier is a choice made per order — which also means the prices on the
 * chart are whichever supplier is showing above it.
 */
export function SupplierStep({
  suppliers,
  university,
  initialWeek,
  initialToothType,
  lastSupplierId,
}: {
  suppliers: DirectorySupplier[];
  university: string | null;
  initialWeek: number;
  initialToothType: ToothType;
  lastSupplierId: string | null;
}) {
  // Pre-selected, not pre-committed: whoever they bought from last is the
  // likely answer, and they can still change it before opening the chart.
  const [selected, setSelected] = useState(
    lastSupplierId && suppliers.some((s) => s.id === lastSupplierId) ? lastSupplierId : "",
  );
  const [confirmed, setConfirmed] = useState(false);

  const supplier = suppliers.find((s) => s.id === selected) ?? null;

  if (suppliers.length === 0) {
    return (
      <div className="mx-5 mt-8 rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
        No supplier is taking orders yet. As soon as someone in your year starts supplying, they
        will show up here.
      </div>
    );
  }

  if (confirmed && supplier) {
    return (
      <>
        <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-card border border-rule bg-card px-4 py-3">
          <div className="min-w-0">
            <div className="text-micro uppercase text-ink-faint">Ordering from</div>
            <div className="truncate font-display text-body">{supplier.displayName}</div>
            <div className="tnum text-caption text-ink-muted">
              Frasaco ${supplier.frasacoPrice.toFixed(2)} · Copy A ${supplier.copyAPrice.toFixed(2)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmed(false)}
            className="pressable min-h-11 shrink-0 rounded-control px-3 font-display text-small text-ink underline underline-offset-2"
          >
            Change
          </button>
        </div>

        <OrderBuilder
          supplierId={supplier.id}
          supplierName={supplier.displayName}
          frasacoPrice={supplier.frasacoPrice}
          copyAPrice={supplier.copyAPrice}
          initialWeek={initialWeek}
          initialToothType={initialToothType}
        />
      </>
    );
  }

  return (
    <div className="mx-5 mt-4">
      <p className="mb-3 text-small text-ink-muted">Who are you ordering from?</p>
      <SupplierList
        suppliers={suppliers}
        university={university}
        value={selected}
        onChange={setSelected}
      />
      <button
        type="button"
        disabled={!supplier}
        onClick={() => setConfirmed(true)}
        className="pressable mt-2.5 min-h-11 w-full rounded-control bg-ink py-3 font-display text-body text-card disabled:opacity-30"
      >
        {supplier ? `Order from ${supplier.displayName}` : "Choose a supplier"}
      </button>
    </div>
  );
}
