"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DentalChart, toothSelectionKey, type ToothSelections } from "./dental-chart";
import { ToothSheet } from "./tooth-sheet";
import { ReviewSheet } from "./review-sheet";
import { CancelOrderButton } from "@/app/student/orders/cancel-order-button";
import { editToothOrder, submitToothOrder } from "@/app/student/_actions/orders";
import type { PriceMove, ProductPriceMove } from "@/lib/orders/price-change";
import { priceWeeklyOrder } from "@/lib/orders/order-pricing";
import { ExtrasSection, type ExtraOption } from "./extras-section";
import { TypeSwitch } from "./type-switch";
import { describeLines } from "@/app/_components/extras-lines";
import { useCountingMoney } from "@/lib/use-counting-money";
import type { ToothType } from "@/lib/supabase/types";

interface OrderBuilderProps {
  supplierId: string;
  supplierName: string;
  frasacoPrice: number;
  copyAPrice: number;
  initialWeek: number;
  initialToothType: ToothType;
  /** "Saturday 10 Oct, 12:50 PM": when this week's orders close. */
  deadline: string;
  /** The seller's in-stock products right now, priced. Empty hides the section. */
  extras: ExtraOption[];
  /** Present when this screen is editing a pending order rather than placing a new one. */
  edit?: {
    orderId: string;
    /** What the order came to when it was placed. */
    originalTotal: number;
    /** Empty when the supplier's prices have not moved since. */
    priceMoves: PriceMove[];
    /** Extras on the order that are on sale at a different price now. */
    productMoves: ProductPriceMove[];
    /** Extras on the order the seller no longer has; left out, and said so. */
    goneExtras: string[];
    initialSelections: ToothSelections;
    initialExtras: Record<string, number>;
  };
  /** A new order started from an earlier one (Reorder): its lines, at today's prices. */
  prefill?: {
    initialSelections: ToothSelections;
    initialExtras: Record<string, number>;
    /** Extras on the earlier order the seller no longer has; left out, and said so. */
    goneExtras: string[];
    /** Open straight onto the review sheet. */
    openReview: boolean;
  };
}

interface UndoState {
  message: string;
  snapshot: ToothSelections;
}

const UNDO_TIMEOUT_MS = 5000;

export function OrderBuilder({
  supplierId,
  supplierName,
  frasacoPrice,
  copyAPrice,
  initialWeek,
  initialToothType,
  deadline,
  extras,
  edit,
  prefill,
}: OrderBuilderProps) {
  const router = useRouter();
  // Fixed for the life of the screen: the week comes from the calendar,
  // not from a control.
  const [week] = useState(initialWeek);
  const start = edit ?? prefill;
  const [selections, setSelections] = useState<ToothSelections>(start?.initialSelections ?? {});
  const [extraQty, setExtraQty] = useState<Record<string, number>>(start?.initialExtras ?? {});
  // The type a newly tapped tooth starts as. Defaults to the student's
  // last used type: of 286 orders in a semester only 4 mixed both.
  const [newToothType, setNewToothType] = useState<ToothType>(initialToothType);
  const [sheetTooth, setSheetTooth] = useState<number | null>(null);
  const [sheetFrasacoQty, setSheetFrasacoQty] = useState(0);
  const [sheetCopyQty, setSheetCopyQty] = useState(0);
  // Reorder opens on the review, as long as something is left to review.
  const [reviewOpen, setReviewOpen] = useState(
    () =>
      !!prefill?.openReview &&
      (Object.keys(prefill.initialSelections).length > 0 || Object.keys(prefill.initialExtras).length > 0),
  );
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

  const extraInputs = useMemo(
    () =>
      Object.entries(extraQty)
        .filter(([, quantity]) => quantity > 0)
        .map(([productId, quantity]) => ({ productId, quantity })),
    [extraQty],
  );

  // Teeth and extras priced together, in cents, from the prices on this
  // screen — which are the prices the database will use, read fresh.
  const priced = useMemo(
    () =>
      priceWeeklyOrder(
        itemInputs,
        prices,
        extraInputs,
        extras.map((e) => ({ productId: e.productId, name: e.name, unit: e.unit, price: e.price })),
      ),
    [itemInputs, prices, extraInputs, extras],
  );
  const pricedItems = priced.teeth;
  const pricedExtras = priced.extras;
  const subtotal = priced.total;

  const totalTeeth = itemInputs.reduce((sum, item) => sum + item.quantity, 0);
  const totalExtras = pricedExtras.reduce((sum, item) => sum + item.quantity, 0);
  const hasLines = itemInputs.length + pricedExtras.length > 0;
  const totalRef = useCountingMoney(subtotal);

  function setExtra(productId: string, quantity: number) {
    setExtraQty((prev) => ({ ...prev, [productId]: Math.max(0, Math.min(10, quantity)) }));
  }

  function openSheet(toothNumber: number) {
    const existingFrasaco = selections[toothSelectionKey(toothNumber, "frasaco")];
    const existingCopy = selections[toothSelectionKey(toothNumber, "copy_a")];
    setSheetTooth(toothNumber);
    if (!existingFrasaco && !existingCopy) {
      // One of the type chosen in the switch, so the common case needs no
      // extra taps.
      setSheetFrasacoQty(newToothType === "frasaco" ? 1 : 0);
      setSheetCopyQty(newToothType === "copy_a" ? 1 : 0);
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
      // Both paths send the total on this screen. The database charges
      // exactly that, or refuses and says what the total is now.
      // Only extras that are priced on this screen are sent: a pick for a
      // product that has since gone would be refused, and was never in the
      // total the student is agreeing to.
      const extrasToSend = pricedExtras.map((e) => ({ productId: e.productId, quantity: e.quantity }));
      const result = edit
        ? await editToothOrder({ orderId: edit.orderId, items: itemInputs, extras: extrasToSend, expectedTotal: subtotal })
        : await submitToothOrder({ supplierId, weekNumber: week, items: itemInputs, extras: extrasToSend, expectedTotal: subtotal });

      if (result.kind === "pricesChanged") {
        // The supplier moved their prices while this screen was open.
        // Nothing was saved. Reload the prices from the server — the
        // chart, the total and the edit notice all recompute from them —
        // and let the student confirm again, having seen the real number.
        setError(
          `Prices changed while you were ${edit ? "editing" : "ordering"}. The total is now $${result.newTotal.toFixed(2)}, not $${subtotal.toFixed(2)}. Check it and ${edit ? "save" : "place the order"} again.`,
        );
        router.refresh();
        return;
      }
      if (result.kind === "productGone") {
        // An extra was switched off or ran out while this screen was open.
        // Nothing was saved. Reload the seller's list — the gone product
        // drops out of the section and the total — and say which.
        setError(`${result.message}. It has been taken off this order — check the total and try again.`);
        router.refresh();
        return;
      }
      if (result.kind === "error") {
        setError(result.message);
        return;
      }
      // No haptic here: the tick lands when the hold completes, on the
      // review sheet. A second one on success would read as two events.
      router.push(`/student/order/confirmed/${result.orderId}${edit ? "?edited=1" : ""}`);
    });
  }

  return (
    <>
      {/* No week on screen: students don't think in semester weeks. The
          database files each order under the week its seller has set; the
          student only needs the deadline. */}
      <div className="mt-3">
        <TypeSwitch value={newToothType} onChange={setNewToothType} frasacoPrice={frasacoPrice} copyAPrice={copyAPrice} />
        <p className="mt-2 text-center text-native-caption text-ink-muted">
          Order by <span className="text-ink">{deadline}</span>
        </p>
      </div>

      <div className="mt-3.5">
        <DentalChart selections={selections} onTapTooth={openSheet} />
      </div>
      <p className="mx-5 mt-2 text-center text-native-caption text-ink-faint">
        Tap a tooth to choose type and quantity
      </p>

      <ExtrasSection supplierName={supplierName} options={extras} quantities={extraQty} onChange={setExtra} />

      {/* Keeps the last row clear of the floating bar. */}
      <div aria-hidden className="h-[8.125rem]" />

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md flex-col items-center px-3"
        style={{ paddingBottom: "calc(1.625rem + env(safe-area-inset-bottom))" }}
      >
        {undo && (
          <div
            role="status"
            className="note-in pointer-events-auto mb-3 flex h-9 items-center gap-3 whitespace-nowrap rounded-full bg-[rgba(20,18,15,0.86)] pl-3.5 pr-1.5 text-[0.875rem] text-card"
          >
            {undo.message}
            <button
              type="button"
              onClick={applyUndo}
              className="pressable relative h-7 rounded-full bg-[rgba(251,248,240,0.16)] px-3 text-[0.875rem] font-semibold text-card after:absolute after:-inset-2 after:content-['']"
            >
              Undo
            </button>
          </div>
        )}

        <div className="glass-card pointer-events-auto flex w-full items-center gap-3 rounded-bar border-[0.5px] border-[rgba(20,18,15,0.10)] py-2 pl-[1.125rem] pr-2 shadow-floating">
          {/* Editing, with every tooth taken off: there is nothing to
              review, and what the student means is "I don't want this
              order". Offer exactly that. */}
          {edit && !hasLines ? (
            <CancelOrderButton
              orderId={edit.orderId}
              label="Cancel this order"
              onCancelled={() => router.push("/student/orders")}
              wrapperClassName="flex flex-1 flex-col gap-1 py-1"
              className="pressable h-12 w-full rounded-[1.125rem] bg-ink text-native-body font-semibold text-card"
            />
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <span
                  ref={totalRef}
                  className="tnum block text-[1.375rem] font-bold leading-tight tracking-[-0.01em] text-ink"
                  data-testid="order-total"
                >
                  ${subtotal.toFixed(2)}
                </span>
                <div className="tnum truncate text-native-caption text-ink-muted">
                  {hasLines ? describeLines(totalTeeth, totalExtras) : "Nothing yet"}
                </div>
              </div>
              <button
                type="button"
                disabled={!hasLines}
                onClick={() => setReviewOpen(true)}
                className="h-12 shrink-0 rounded-[1.125rem] bg-ink px-6 text-native-body font-semibold text-card transition-transform duration-[120ms] ease-[var(--ease-out)] active:scale-95 disabled:opacity-30 disabled:active:scale-100 motion-reduce:active:scale-100"
              >
                Review
              </button>
            </>
          )}
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
          repName={supplierName}
          items={pricedItems}
          extras={pricedExtras}
          subtotal={subtotal}
          error={error}
          pending={pending}
          mode={edit ? "edit" : "new"}
          priceNotice={
            edit && (edit.priceMoves.length > 0 || edit.productMoves.length > 0)
              ? { moves: edit.priceMoves, productMoves: edit.productMoves, was: edit.originalTotal, now: subtotal }
              : null
          }
          goneNotice={
            edit && edit.goneExtras.length > 0
              ? edit.goneExtras
              : prefill && prefill.goneExtras.length > 0
                ? prefill.goneExtras
                : null
          }
          onClose={() => setReviewOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
