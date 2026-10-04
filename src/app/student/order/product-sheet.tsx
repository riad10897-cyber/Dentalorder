"use client";

import { categoryName } from "@/lib/products/categories";
import type { ExtraOption } from "./extras-section";
import { BottomSheet } from "./bottom-sheet";

const MAX_QTY = 10;

/**
 * One extra, opened from the list: everything the seller wrote about it,
 * and the same stepper the list row has. Changes apply as they are made,
 * exactly like the row's stepper, so "Done" only closes. Swipe it down,
 * tap outside or tap Done: all three slide it away.
 */
export function ProductSheet({
  option,
  quantity,
  onChange,
  onClose,
}: {
  option: ExtraOption;
  quantity: number;
  onChange: (quantity: number) => void;
  onClose: () => void;
}) {
  const facts = [
    option.brand ? { label: "Brand", value: option.brand } : null,
    option.unit ? { label: "Pack size", value: option.unit } : null,
    { label: "Category", value: categoryName(option.category) },
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <BottomSheet
      label={option.name}
      onClose={onClose}
      zIndex="z-50"
      className="flex max-h-[85vh] flex-col"
      header={
        <>
          <div className="font-display text-title">{option.name}</div>
          <div className="tnum font-display text-lead text-ink">
            ${option.price.toFixed(2)}
            <span className="font-body text-small text-ink-muted">{option.unit ? ` · ${option.unit}` : " each"}</span>
          </div>
        </>
      }
    >
      {(dismiss) => (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            {option.description ? (
              <p className="whitespace-pre-line text-body text-ink">{option.description}</p>
            ) : (
              <p className="text-small text-ink-muted">The seller hasn&rsquo;t added a description.</p>
            )}

            <dl className="mt-4 border-t border-hairline">
              {facts.map((fact) => (
                <div key={fact.label} className="flex justify-between gap-3 border-b border-hairline py-2.5">
                  <dt className="text-small text-ink-muted">{fact.label}</dt>
                  <dd className="min-w-0 text-right text-small text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mx-5 mt-4 flex shrink-0 items-center justify-between">
            <span className="text-small text-ink-muted">In this order</span>
            <span className="flex items-center gap-2.5">
              <Step
                label={`One fewer ${option.name}`}
                symbol="−"
                disabled={quantity === 0}
                onClick={() => onChange(quantity - 1)}
              />
              <span className="tnum w-6 text-center font-display text-lead" aria-live="polite">
                {quantity}
              </span>
              <Step
                label={`One more ${option.name}`}
                symbol="+"
                disabled={quantity >= MAX_QTY}
                onClick={() => onChange(quantity + 1)}
              />
            </span>
          </div>

          <div className="mt-4 shrink-0 px-5">
            <button
              type="button"
              onClick={dismiss}
              className="pressable min-h-11 w-full rounded-control bg-ink py-3 font-display text-body text-card"
            >
              Done
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

function Step({
  label,
  symbol,
  disabled,
  onClick,
}: {
  label: string;
  symbol: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pressable flex h-11 w-11 items-center justify-center rounded-control border border-rule bg-card font-display text-lead disabled:opacity-30"
    >
      {symbol}
    </button>
  );
}
