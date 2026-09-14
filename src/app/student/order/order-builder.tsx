"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DentalChart, toothSelectionKey, type ToothSelections } from "./dental-chart";
import { submitToothOrder } from "@/app/student/_actions/orders";
import { priceToothOrder } from "@/lib/orders/tooth-pricing";
import { TOOTH_NAMES } from "@/lib/teeth/fdi";
import type { ToothType } from "@/lib/supabase/types";

interface OrderBuilderProps {
  repName: string | null;
  frasacoPrice: number;
  copyAPrice: number;
  initialWeek: number;
  initialToothType: ToothType;
}

export function OrderBuilder({
  repName,
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const prices = useMemo(() => ({ frasacoPrice, copyAPrice }), [frasacoPrice, copyAPrice]);

  const itemInputs = useMemo(
    () =>
      Object.entries(selections).map(([key, sel]) => ({
        toothNumber: Number(key.split(":")[0]),
        toothType: sel.toothType,
        quantity: sel.quantity,
      })),
    [selections],
  );

  const { items: pricedItems, subtotal } = useMemo(
    () => priceToothOrder(itemInputs, prices),
    [itemInputs, prices],
  );

  const toothCount = itemInputs.length;

  function openSheet(toothNumber: number) {
    const existingFrasaco = selections[toothSelectionKey(toothNumber, "frasaco")];
    const existingCopy = selections[toothSelectionKey(toothNumber, "copy_a")];
    setSheetTooth(toothNumber);
    if (!existingFrasaco && !existingCopy) {
      // Nothing chosen for this tooth yet — default to the student's last
      // used type, per the "286 orders, only 4 mixed" domain note.
      setSheetFrasacoQty(initialToothType === "frasaco" ? 1 : 0);
      setSheetCopyQty(initialToothType === "copy_a" ? 1 : 0);
    } else {
      setSheetFrasacoQty(existingFrasaco?.quantity ?? 0);
      setSheetCopyQty(existingCopy?.quantity ?? 0);
    }
  }

  function closeSheet() {
    setSheetTooth(null);
  }

  function addTooth() {
    if (sheetTooth === null) return;
    const frasacoKey = toothSelectionKey(sheetTooth, "frasaco");
    const copyKey = toothSelectionKey(sheetTooth, "copy_a");
    setSelections((prev) => {
      const next = { ...prev };
      if (sheetFrasacoQty > 0) next[frasacoKey] = { toothType: "frasaco", quantity: sheetFrasacoQty };
      else delete next[frasacoKey];
      if (sheetCopyQty > 0) next[copyKey] = { toothType: "copy_a", quantity: sheetCopyQty };
      else delete next[copyKey];
      return next;
    });
    closeSheet();
  }

  function removeTooth() {
    if (sheetTooth === null) return;
    setSelections((prev) => {
      const next = { ...prev };
      delete next[toothSelectionKey(sheetTooth, "frasaco")];
      delete next[toothSelectionKey(sheetTooth, "copy_a")];
      return next;
    });
    closeSheet();
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await submitToothOrder({
        weekNumber: week,
        items: itemInputs,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/student/order/confirmed/${result.orderId}`);
    });
  }

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

      <div className="mx-6 mt-3.5 flex gap-3 text-xs text-text-muted">
        <Legend swatchClass="bg-accent/30" label="Frasaco" />
        <Legend swatchClass="bg-copy-a/30" label="Copy A" />
        <Legend swatchClass="bg-white/5" label="Tap to add" />
      </div>

      <div className="mt-5">
        <DentalChart selections={selections} onTapTooth={openSheet} />
      </div>

      <div className="mx-6 mt-4 flex items-center justify-between rounded-lg border border-border bg-surface2 px-4 py-3.5">
        <div>
          <div className="text-[13px] text-text-muted">Order total</div>
          <div className="font-heading text-lg font-bold">
            {toothCount} teeth · <span className="text-accent">${subtotal.toFixed(2)}</span>
          </div>
        </div>
        <button
          type="button"
          disabled={toothCount === 0}
          onClick={() => setReviewOpen(true)}
          className="min-h-11 rounded-full bg-accent px-5 py-2.5 font-heading text-sm font-bold text-bg disabled:opacity-40"
        >
          Review
        </button>
      </div>

      <div className="h-6" />

      {sheetTooth !== null && (
        <ToothSheet
          toothNumber={sheetTooth}
          frasacoQty={sheetFrasacoQty}
          copyQty={sheetCopyQty}
          hasExisting={Boolean(
            selections[toothSelectionKey(sheetTooth, "frasaco")] ||
              selections[toothSelectionKey(sheetTooth, "copy_a")],
          )}
          frasacoPrice={frasacoPrice}
          copyAPrice={copyAPrice}
          onChangeFrasacoQty={setSheetFrasacoQty}
          onChangeCopyQty={setSheetCopyQty}
          onAdd={addTooth}
          onRemove={removeTooth}
          onClose={closeSheet}
        />
      )}

      {reviewOpen && (
        <ReviewSheet
          week={week}
          repName={repName}
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

function Legend({ swatchClass, label }: { swatchClass: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-[3px] ${swatchClass}`} />
      {label}
    </span>
  );
}

function ToothSheet({
  toothNumber,
  frasacoQty,
  copyQty,
  hasExisting,
  frasacoPrice,
  copyAPrice,
  onChangeFrasacoQty,
  onChangeCopyQty,
  onAdd,
  onRemove,
  onClose,
}: {
  toothNumber: number;
  frasacoQty: number;
  copyQty: number;
  hasExisting: boolean;
  frasacoPrice: number;
  copyAPrice: number;
  onChangeFrasacoQty: (q: number) => void;
  onChangeCopyQty: (q: number) => void;
  onAdd: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const canAdd = frasacoQty > 0 || copyQty > 0;
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-surface px-6 pb-10 pt-3">
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border" />
        <div className="font-heading text-[22px] font-extrabold">Tooth #{toothNumber}</div>
        <div className="mb-1 text-[13px] text-text-muted">{TOOTH_NAMES[toothNumber]}</div>
        <div className="mb-6 text-xs text-text-muted">Pick either type, or both.</div>

        <div className="mb-6 flex flex-col gap-2.5">
          <TypeOption
            label="Frasaco"
            price={frasacoPrice}
            colorClass="text-accent"
            selectedBorder="border-accent bg-accent/10"
            qty={frasacoQty}
            onChangeQty={onChangeFrasacoQty}
          />
          <TypeOption
            label="Copy A"
            price={copyAPrice}
            colorClass="text-copy-a"
            selectedBorder="border-copy-a bg-copy-a/10"
            qty={copyQty}
            onChangeQty={onChangeCopyQty}
          />
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          className="min-h-11 w-full rounded-lg bg-accent py-4 font-heading text-base font-bold text-bg active:scale-[0.99] disabled:opacity-40"
        >
          {hasExisting ? "Update Tooth" : "Add to Order"}
        </button>
        {hasExisting && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-2 min-h-11 w-full rounded-lg py-3 text-sm text-text-muted"
          >
            Remove from order
          </button>
        )}
      </div>
    </div>
  );
}

function TypeOption({
  label,
  price,
  colorClass,
  selectedBorder,
  qty,
  onChangeQty,
}: {
  label: string;
  price: number;
  colorClass: string;
  selectedBorder: string;
  qty: number;
  onChangeQty: (q: number) => void;
}) {
  const selected = qty > 0;
  return (
    <div
      className={`flex min-h-11 items-center justify-between rounded-lg border-[1.5px] p-3.5 transition-colors ${
        selected ? selectedBorder : "border-border bg-surface2"
      }`}
    >
      <button
        type="button"
        onClick={() => onChangeQty(selected ? 0 : 1)}
        className="flex-1 text-left"
      >
        <div className={`font-heading text-[15px] font-bold ${colorClass}`}>{label}</div>
        <div className="text-xs text-text-muted">${price.toFixed(2)} / tooth</div>
      </button>
      {selected && (
        <div className="flex items-center gap-3">
          <QtyButton
            label="−"
            aria-label={`Decrease ${label} quantity`}
            onClick={() => onChangeQty(Math.max(0, qty - 1))}
          />
          <span className="min-w-6 text-center font-heading text-lg font-bold">{qty}</span>
          <QtyButton
            label="+"
            aria-label={`Increase ${label} quantity`}
            onClick={() => onChangeQty(Math.min(10, qty + 1))}
          />
        </div>
      )}
    </div>
  );
}

function QtyButton({
  label,
  "aria-label": ariaLabel,
  onClick,
}: {
  label: string;
  "aria-label": string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface2 text-lg"
    >
      {label}
    </button>
  );
}

function ReviewSheet({
  week,
  repName,
  items,
  subtotal,
  error,
  pending,
  onClose,
  onConfirm,
}: {
  week: number;
  repName: string | null;
  items: ReturnType<typeof priceToothOrder>["items"];
  subtotal: number;
  error: string | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-surface px-6 pb-8 pt-3">
        <div className="mx-auto mb-5 h-1 w-9 shrink-0 rounded-full bg-border" />
        <div className="mb-1 font-heading text-xl font-bold">Review Order</div>
        <div className="mb-5 text-[13px] text-text-muted">
          Week {week}
          {repName ? ` · to ${repName}` : ""}
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.toothNumber}
              className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-none"
            >
              <div>
                <span className="font-medium">Tooth #{item.toothNumber}</span>
                <span className="ml-2 text-text-muted">
                  {item.toothType === "frasaco" ? "Frasaco" : "Copy A"} · x{item.quantity}
                </span>
              </div>
              <span className="font-heading font-bold">${item.lineTotal.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-surface2 px-4 py-3.5">
          <span className="text-sm font-semibold">Order Total</span>
          <span
            data-testid="review-total"
            className="font-heading text-xl font-extrabold text-accent"
          >
            ${subtotal.toFixed(2)}
          </span>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="min-h-11 flex-1 rounded-lg border border-border py-3.5 text-sm font-semibold text-text-muted"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="min-h-11 flex-[2] rounded-lg bg-accent py-3.5 font-heading text-sm font-bold text-bg disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Confirm Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
