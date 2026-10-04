"use client";

import { TOOTH_NAMES } from "@/lib/teeth/fdi";
import { BottomSheet, SheetTitle, sheetPrimary, sheetSecondary } from "./bottom-sheet";
import { PillStepper } from "./extras-section";

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
  // At zero the main button removes the tooth (if it was on the order);
  // for a tooth not yet added there is nothing to do.
  const removing = combinedQty === 0;

  return (
    <BottomSheet
      label={`Tooth ${toothNumber} options`}
      onClose={onClose}
      header={<SheetTitle title={`Tooth ${toothNumber}`} subtitle={TOOTH_NAMES[toothNumber]} />}
    >
      {() => (
        <>
          <div className="mx-4 mt-2.5 overflow-hidden rounded-button bg-fill-faint">
            <TypeRow label="Frasaco" price={frasacoPrice} dot="var(--frasaco)" qty={frasacoQty} onChange={onChangeFrasacoQty} />
            <div aria-hidden className="ml-[2.375rem] border-t-[0.5px] border-separator" />
            <TypeRow label="Copy A" price={copyAPrice} dot="var(--copy-a)" qty={copyQty} onChange={onChangeCopyQty} />
          </div>

          <div className="flex gap-2 px-4 pt-4">
            {hasExisting && !removing && (
              <button type="button" onClick={onRemove} className={sheetSecondary}>
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={removing ? onRemove : onCommit}
              disabled={removing && !hasExisting}
              className={`${sheetPrimary} tnum flex-1`}
              data-testid="sheet-subtotal"
            >
              {removing ? "Remove" : `${hasExisting ? "Update" : "Add"} · $${positionSubtotal.toFixed(2)}`}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

function TypeRow({
  label,
  price,
  dot,
  qty,
  onChange,
}: {
  label: string;
  price: number;
  dot: string;
  qty: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot }} />
      <span className="min-w-0 flex-1">
        <span className="text-native-body text-ink">{label}</span>{" "}
        <span className="tnum text-list-secondary text-ink-faint">${price.toFixed(2)}</span>
      </span>
      <PillStepper
        name={label}
        value={qty}
        onChange={(q) => onChange(Math.max(0, Math.min(MAX_QTY, q)))}
        max={MAX_QTY}
        height="h-9"
        surface="bg-card"
        countClass="text-native-body"
        buttonWidth="w-11"
      />
    </div>
  );
}
