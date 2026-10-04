"use client";

import { TOOTH_NAMES } from "@/lib/teeth/fdi";
import { BottomSheet } from "./bottom-sheet";

interface ToothSheetProps {
  toothNumber: number;
  frasacoQty: number;
  copyQty: number;
  frasacoPrice: number;
  copyAPrice: number;
  hasExisting: boolean;
  onChangeFrasacoQty: (q: number) => void;
  onChangeCopyQty: (q: number) => void;
  onCommit: () => void;
  onRemove: () => void;
  onClose: () => void;
}

const MAX_QTY = 10;

export function ToothSheet({
  toothNumber,
  frasacoQty,
  copyQty,
  frasacoPrice,
  copyAPrice,
  hasExisting,
  onChangeFrasacoQty,
  onChangeCopyQty,
  onCommit,
  onRemove,
  onClose,
}: ToothSheetProps) {
  const positionSubtotal = frasacoQty * frasacoPrice + copyQty * copyAPrice;
  const combinedQty = frasacoQty + copyQty;

  return (
    <BottomSheet
      label={`Tooth ${toothNumber} options`}
      onClose={onClose}
      header={
        <>
          <div className="font-display text-title">Tooth {toothNumber}</div>
          <div className="text-small text-ink-muted">{TOOTH_NAMES[toothNumber]}</div>
        </>
      }
    >
      {() => (
        <>
          <div className="flex flex-col gap-2 px-5">
            <TypeRow
              label="Frasaco"
              price={frasacoPrice}
              accent="var(--frasaco)"
              qty={frasacoQty}
              onChange={onChangeFrasacoQty}
            />
            <TypeRow
              label="Copy A"
              price={copyAPrice}
              accent="var(--copy-a)"
              qty={copyQty}
              onChange={onChangeCopyQty}
            />
          </div>

          <div className="mx-5 mt-4 flex items-center justify-between border-t border-hairline pt-3">
            <span className="text-small text-ink-muted">
              <span className="tnum font-display">{combinedQty}</span>{" "}
              {combinedQty === 1 ? "tooth" : "teeth"} at this position
            </span>
            <span
              key={positionSubtotal}
              className="total-change tnum font-display text-lead"
              data-testid="sheet-subtotal"
            >
              ${positionSubtotal.toFixed(2)}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2 px-5">
            <button
              type="button"
              onClick={onCommit}
              disabled={combinedQty === 0}
              className="pressable min-h-11 w-full rounded-control bg-ink py-3 font-display text-body text-card disabled:opacity-35"
            >
              {hasExisting ? "Update order" : "Add to order"}
            </button>
            {hasExisting && (
              <button
                type="button"
                onClick={onRemove}
                className="pressable min-h-11 w-full rounded-control py-2.5 text-small text-ink-muted"
              >
                Remove from order
              </button>
            )}
          </div>
        </>
      )}
    </BottomSheet>
  );
}

function TypeRow({
  label,
  price,
  accent,
  qty,
  onChange,
}: {
  label: string;
  price: number;
  accent: string;
  qty: number;
  onChange: (q: number) => void;
}) {
  const active = qty > 0;
  return (
    <div
      className={`flex items-center justify-between rounded-control border px-3.5 py-3 ${
        active ? "bg-card-sunk" : "bg-card"
      }`}
      style={{ borderColor: active ? accent : "var(--rule)" }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-[2px]"
          style={{ background: accent }}
        />
        <div>
          <div className="font-display text-body">{label}</div>
          <div className="tnum font-display text-caption text-ink-muted">${price.toFixed(2)} each</div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <StepperButton
          label="−"
          ariaLabel={`One fewer ${label}`}
          disabled={qty === 0}
          onClick={() => onChange(Math.max(0, qty - 1))}
        />
        <span className="tnum w-5 text-center font-display text-lead">{qty}</span>
        <StepperButton
          label="+"
          ariaLabel={`One more ${label}`}
          disabled={qty >= MAX_QTY}
          onClick={() => onChange(Math.min(MAX_QTY, qty + 1))}
        />
      </div>
    </div>
  );
}

function StepperButton({
  label,
  ariaLabel,
  disabled,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="pressable flex h-11 w-11 items-center justify-center rounded-control border border-rule bg-card font-display text-lead disabled:opacity-30"
    >
      {label}
    </button>
  );
}
