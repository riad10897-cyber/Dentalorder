"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DentalChart, type ToothSelections } from "./dental-chart";
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
  const [sheetType, setSheetType] = useState<ToothType>(initialToothType);
  const [sheetQty, setSheetQty] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const prices = useMemo(() => ({ frasacoPrice, copyAPrice }), [frasacoPrice, copyAPrice]);

  const itemInputs = useMemo(
    () =>
      Object.entries(selections).map(([toothNumber, sel]) => ({
        toothNumber: Number(toothNumber),
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
    const existing = selections[toothNumber];
    setSheetTooth(toothNumber);
    setSheetType(existing?.toothType ?? initialToothType);
    setSheetQty(existing?.quantity ?? 1);
  }

  function closeSheet() {
    setSheetTooth(null);
  }

  function addTooth() {
    if (sheetTooth === null) return;
    setSelections((prev) => ({
      ...prev,
      [sheetTooth]: { toothType: sheetType, quantity: sheetQty },
    }));
    closeSheet();
  }

  function removeTooth() {
    if (sheetTooth === null) return;
    setSelections((prev) => {
      const next = { ...prev };
      delete next[sheetTooth];
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
          type={sheetType}
          qty={sheetQty}
          hasExisting={Boolean(selections[sheetTooth])}
          frasacoPrice={frasacoPrice}
          copyAPrice={copyAPrice}
          onChangeType={setSheetType}
          onChangeQty={setSheetQty}
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
  type,
  qty,
  hasExisting,
  frasacoPrice,
  copyAPrice,
  onChangeType,
  onChangeQty,
  onAdd,
  onRemove,
  onClose,
}: {
  toothNumber: number;
  type: ToothType;
  qty: number;
  hasExisting: boolean;
  frasacoPrice: number;
  copyAPrice: number;
  onChangeType: (t: ToothType) => void;
  onChangeQty: (q: number) => void;
  onAdd: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-surface px-6 pb-10 pt-3">
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border" />
        <div className="font-heading text-[22px] font-extrabold">Tooth #{toothNumber}</div>
        <div className="mb-6 text-[13px] text-text-muted">{TOOTH_NAMES[toothNumber]}</div>

        <div className="mb-6 flex gap-2.5">
          <TypeOption
            label="Frasaco"
            price={frasacoPrice}
            colorClass="text-accent"
            selected={type === "frasaco"}
            selectedBorder="border-accent bg-accent/10"
            onClick={() => onChangeType("frasaco")}
          />
          <TypeOption
            label="Copy A"
            price={copyAPrice}
            colorClass="text-copy-a"
            selected={type === "copy_a"}
            selectedBorder="border-copy-a bg-copy-a/10"
            onClick={() => onChangeType("copy_a")}
          />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-medium">Quantity</span>
          <div className="flex items-center gap-4">
            <QtyButton label="−" aria-label="Decrease quantity" onClick={() => onChangeQty(Math.max(1, qty - 1))} />
            <span className="min-w-8 text-center font-heading text-xl font-bold">{qty}</span>
            <QtyButton label="+" aria-label="Increase quantity" onClick={() => onChangeQty(Math.min(10, qty + 1))} />
          </div>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="min-h-11 w-full rounded-lg bg-accent py-4 font-heading text-base font-bold text-bg active:scale-[0.99]"
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
  selected,
  selectedBorder,
  onClick,
}: {
  label: string;
  price: number;
  colorClass: string;
  selected: boolean;
  selectedBorder: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 flex-1 rounded-lg border-[1.5px] p-3.5 text-center transition-colors ${
        selected ? selectedBorder : "border-border bg-surface2"
      }`}
    >
      <div className={`font-heading text-[15px] font-bold ${colorClass}`}>{label}</div>
      <div className="text-xs text-text-muted">${price.toFixed(2)} / tooth</div>
    </button>
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
