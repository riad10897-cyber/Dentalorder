"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DentalChart, toothSelectionKey, type ToothSelections } from "./dental-chart";
import { ToothSheet } from "./tooth-sheet";
import { ReviewSheet } from "./review-sheet";
import { submitToothOrder } from "@/app/student/_actions/orders";
import { priceToothOrder } from "@/lib/orders/tooth-pricing";
import { haptic } from "@/lib/haptics";
import { useCountingMoney } from "@/lib/use-counting-money";
import type { ToothType } from "@/lib/supabase/types";

interface OrderBuilderProps {
  supplierId: string;
  supplierName: string;
  frasacoPrice: number;
  copyAPrice: number;
  initialWeek: number;
  initialToothType: ToothType;
}

interface UndoState {
  message: string;
  snapshot: ToothSelections;
}

const UNDO_TIMEOUT_MS = 7000;

export function OrderBuilder({
  supplierId,
  supplierName,
  frasacoPrice,
  copyAPrice,
  initialWeek,
  initialToothType,
}: OrderBuilderProps) {
  const router = useRouter();
  const [week, setWeek] = useState(initialWeek);
  const [selections, setSelections] = useState<ToothSelections>({});
  const [sheetTooth, setSheetTooth] = useState<number | null>(null);
  const [sheetFrasacoQty, setSheetFrasacoQty] = useState(0);
  const [sheetCopyQty, setSheetCopyQty] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offerUndo = useCallback((message: string, snapshot: ToothSelections) => {
    setUndo({ message, snapshot });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  const prices = useMemo(() => ({ frasacoPrice, copyAPrice }), [frasacoPrice, copyAPrice]);

  const itemInputs = useMemo(
    () =>
      Object.entries(selections)
        .map(([key, sel]) => ({
          toothNumber: Number(key.split(":")[0]),
          toothType: sel.toothType,
          quantity: sel.quantity,
        }))
        .sort(
          (a, b) =>
            a.toothNumber - b.toothNumber ||
            (a.toothType === "frasaco" ? 0 : 1) - (b.toothType === "frasaco" ? 0 : 1),
        ),
    [selections],
  );

  const { items: pricedItems, subtotal } = useMemo(
    () => priceToothOrder(itemInputs, prices),
    [itemInputs, prices],
  );

  const totalTeeth = itemInputs.reduce((sum, item) => sum + item.quantity, 0);
  const totalRef = useCountingMoney(subtotal);

  function openSheet(toothNumber: number) {
    const existingFrasaco = selections[toothSelectionKey(toothNumber, "frasaco")];
    const existingCopy = selections[toothSelectionKey(toothNumber, "copy_a")];
    setSheetTooth(toothNumber);
    if (!existingFrasaco && !existingCopy) {
      // Default to the student's last used type: of 286 orders in a
      // semester only 4 mixed both types, so the common case should need
      // no extra taps.
      setSheetFrasacoQty(initialToothType === "frasaco" ? 1 : 0);
      setSheetCopyQty(initialToothType === "copy_a" ? 1 : 0);
    } else {
      setSheetFrasacoQty(existingFrasaco?.quantity ?? 0);
      setSheetCopyQty(existingCopy?.quantity ?? 0);
    }
  }

  function commitSheet() {
    if (sheetTooth === null) return;
    const snapshot = selections;
    const frasacoKey = toothSelectionKey(sheetTooth, "frasaco");
    const copyKey = toothSelectionKey(sheetTooth, "copy_a");
    const hadAny = Boolean(snapshot[frasacoKey] || snapshot[copyKey]);

    setSelections((prev) => {
      const next = { ...prev };
      if (sheetFrasacoQty > 0) next[frasacoKey] = { toothType: "frasaco", quantity: sheetFrasacoQty };
      else delete next[frasacoKey];
      if (sheetCopyQty > 0) next[copyKey] = { toothType: "copy_a", quantity: sheetCopyQty };
      else delete next[copyKey];
      return next;
    });

    // Committing zero quantities is a removal, and a removal the student
    // didn't mean is exactly the mis-tap they need a way back from.
    const removed = sheetFrasacoQty === 0 && sheetCopyQty === 0;
    if (removed) offerUndo(`Removed tooth ${sheetTooth}`, snapshot);
    else if (hadAny) offerUndo(`Updated tooth ${sheetTooth}`, snapshot);
    else offerUndo(`Added tooth ${sheetTooth}`, snapshot);

    setSheetTooth(null);
  }

  function removeFromSheet() {
    if (sheetTooth === null) return;
    const snapshot = selections;
    setSelections((prev) => {
      const next = { ...prev };
      delete next[toothSelectionKey(sheetTooth, "frasaco")];
      delete next[toothSelectionKey(sheetTooth, "copy_a")];
      return next;
    });
    offerUndo(`Removed tooth ${sheetTooth}`, snapshot);
    setSheetTooth(null);
  }

  function applyUndo() {
    if (!undo) return;
    setSelections(undo.snapshot);
    setUndo(null);
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await submitToothOrder({ supplierId, weekNumber: week, items: itemInputs });
      if (result.error) {
        setError(result.error);
        return;
      }
      // Success is only knowable once the order is written, so this is
      // as early as the tick can honestly fire. It goes in the same
      // frame as the navigation that shows the confirmation, rather
      // than on the confirmation screen after it has hydrated, which
      // would land the tick noticeably late.
      haptic();
      router.push(`/student/order/confirmed/${result.orderId}`);
    });
  }

  return (
    <>
      <div
        className="flex gap-1.5 overflow-x-auto px-5 pb-1 pt-4"
        style={{ scrollbarWidth: "none" }}
      >
        {Array.from({ length: 17 }, (_, i) => i + 1).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWeek(w)}
            aria-pressed={w === week}
            className={`pressable tnum min-h-9 shrink-0 rounded-control border px-3 py-1.5 font-display text-small ${
              w === week
                ? "border-ink bg-ink text-card"
                : "border-rule bg-card text-ink-muted"
            }`}
          >
            Wk {w}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <DentalChart
          selections={selections}
          frasacoPrice={frasacoPrice}
          copyAPrice={copyAPrice}
          onTapTooth={openSheet}
        />
      </div>

      <InThisOrder items={pricedItems} />

      {/* Footer is pinned; this keeps the last card clear of it. */}
      <div className="h-32" />

      <div className="scroll-edge fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md bg-paper px-5 pb-6 pt-3">
        {undo && (
          <div className="total-change mb-2 flex items-center justify-between rounded-control border border-rule bg-card-sunk px-3 py-2">
            <span className="text-small text-ink-muted">{undo.message}</span>
            <button
              type="button"
              onClick={applyUndo}
              className="pressable -my-2 px-2 py-2 font-display text-small underline underline-offset-2"
            >
              Undo
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-micro uppercase text-ink-faint">Order total</div>
            <div className="flex items-baseline gap-2">
              <span
                ref={totalRef}
                className="tnum font-display text-heading"
                data-testid="order-total"
              >
                ${subtotal.toFixed(2)}
              </span>
              <span className="tnum font-display text-caption text-ink-muted">
                {totalTeeth} {totalTeeth === 1 ? "tooth" : "teeth"}
              </span>
            </div>
          </div>
          <button
            type="button"
            disabled={itemInputs.length === 0}
            onClick={() => setReviewOpen(true)}
            className="pressable min-h-11 rounded-control bg-ink px-6 py-3 font-display text-body text-card disabled:opacity-30"
          >
            Review
          </button>
        </div>
      </div>

      {sheetTooth !== null && (
        <ToothSheet
          toothNumber={sheetTooth}
          frasacoQty={sheetFrasacoQty}
          copyQty={sheetCopyQty}
          frasacoPrice={frasacoPrice}
          copyAPrice={copyAPrice}
          hasExisting={Boolean(
            selections[toothSelectionKey(sheetTooth, "frasaco")] ||
              selections[toothSelectionKey(sheetTooth, "copy_a")],
          )}
          onChangeFrasacoQty={setSheetFrasacoQty}
          onChangeCopyQty={setSheetCopyQty}
          onCommit={commitSheet}
          onRemove={removeFromSheet}
          onClose={() => setSheetTooth(null)}
        />
      )}

      {reviewOpen && (
        <ReviewSheet
          week={week}
          repName={supplierName}
          items={pricedItems}
          subtotal={subtotal}
          error={error}
          pending={pending}
          onClose={() => setReviewOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}

function InThisOrder({ items }: { items: ReturnType<typeof priceToothOrder>["items"] }) {
  return (
    <div className="mx-2 mt-3 rounded-card border border-rule bg-card">
      <div className="border-b border-hairline px-4 py-3 text-micro uppercase text-ink-faint">
        In this order
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-5 text-center text-small text-ink-muted">
          Nothing yet. Tap a tooth above to add it.
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li
              key={`${item.toothNumber}:${item.toothType}`}
              className="flex items-center justify-between border-b border-hairline px-4 py-2.5 last:border-none"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{
                    background:
                      item.toothType === "frasaco" ? "var(--frasaco)" : "var(--copy-a)",
                  }}
                />
                <span className="tnum font-display text-body">Tooth {item.toothNumber}</span>
                <span className="text-caption text-ink-muted">
                  {item.toothType === "frasaco" ? "Frasaco" : "Copy A"}
                </span>
              </span>
              <span className="flex items-baseline gap-3">
                <span className="tnum font-display text-caption text-ink-muted">×{item.quantity}</span>
                <span className="tnum font-display text-body">${item.lineTotal.toFixed(2)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
