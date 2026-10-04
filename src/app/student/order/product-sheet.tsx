"use client";

import { useEffect, useState } from "react";
import { categoryName } from "@/lib/products/categories";
import type { ExtraOption } from "./extras-section";

const MAX_QTY = 10;

/**
 * One extra, opened from the list: everything the seller wrote about it,
 * and the same stepper the list row has. Changes apply as they are made,
 * exactly like the row's stepper, so "Done" only closes.
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
  // A transition rather than keyframes, as on the review sheet: closing
  // mid-open retargets from wherever the panel is.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const facts = [
    option.brand ? { label: "Brand", value: option.brand } : null,
    option.unit ? { label: "Pack size", value: option.unit } : null,
    { label: "Category", value: categoryName(option.category) },
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="scrim absolute inset-0 bg-ink/45 transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ opacity: shown ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={option.name}
        className="sheet-panel relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[0.75rem] bg-card pb-8 shadow-[0_-0.5rem_2rem_rgba(20,18,15,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: shown ? "translateY(0)" : "translateY(100%)" }}
      >
        <div className="shrink-0 px-5 pb-3 pt-3">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-rule" />
          <div className="font-display text-title">{option.name}</div>
          <div className="tnum font-display text-lead text-ink">
            ${option.price.toFixed(2)}
            <span className="font-body text-small text-ink-muted">{option.unit ? ` · ${option.unit}` : " each"}</span>
          </div>
        </div>

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
            onClick={onClose}
            className="pressable min-h-11 w-full rounded-control bg-ink py-3 font-display text-body text-card"
          >
            Done
          </button>
        </div>
      </div>
    </div>
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
