"use client";

import { useEffect, useState } from "react";
import type { priceToothOrder } from "@/lib/orders/tooth-pricing";
import type { PriceMove, ProductPriceMove } from "@/lib/orders/price-change";
import type { PricedExtra } from "@/lib/orders/order-pricing";
import { describeLines } from "@/app/_components/extras-lines";

export function ReviewSheet({
  week,
  repName,
  items,
  extras = [],
  subtotal,
  error,
  pending,
  mode = "new",
  priceNotice = null,
  goneNotice = null,
  onClose,
  onConfirm,
}: {
  week: number;
  repName: string | null;
  items: ReturnType<typeof priceToothOrder>["items"];
  extras?: PricedExtra[];
  subtotal: number;
  error: string | null;
  pending: boolean;
  mode?: "new" | "edit";
  /** Shown only when editing and the supplier's prices moved since the order. */
  priceNotice?: { moves: PriceMove[]; productMoves?: ProductPriceMove[]; was: number; now: number } | null;
  /** Extras on the original order the seller no longer has. Shown when editing. */
  goneNotice?: string[] | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  // A transition rather than keyframes, so closing mid-open retargets
  // from wherever the panel currently is instead of restarting.
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

  const totalTeeth = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalExtras = extras.reduce((sum, item) => sum + item.quantity, 0);

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
        aria-label="Review order"
        className="sheet-panel relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[0.75rem] bg-card pb-8 shadow-[0_-0.5rem_2rem_rgba(20,18,15,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: shown ? "translateY(0)" : "translateY(100%)" }}
      >
        <div className="shrink-0 px-5 pb-3 pt-3">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-rule" />
          <div className="font-display text-title">{mode === "edit" ? "Review changes" : "Review order"}</div>
          <div className="text-small text-ink-muted">
            Week {week}
            {repName ? ` · to ${repName}` : ""}
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-5">
          {items.map((item) => (
            <li
              key={`${item.toothNumber}:${item.toothType}`}
              className="flex items-center justify-between border-b border-hairline py-2.5 last:border-none"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{
                    background: item.toothType === "frasaco" ? "var(--frasaco)" : "var(--copy-a)",
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
          {extras.map((extra) => (
            <li
              key={extra.productId}
              className="flex items-center justify-between gap-3 border-b border-hairline py-2.5 last:border-none"
            >
              <span className="min-w-0 truncate text-body">
                {extra.name}
                {extra.unit && <span className="text-caption text-ink-muted"> · {extra.unit}</span>}
              </span>
              <span className="flex shrink-0 items-baseline gap-3">
                <span className="tnum font-display text-caption text-ink-muted">×{extra.quantity}</span>
                <span className="tnum font-display text-body">${extra.lineTotal.toFixed(2)}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mx-5 mt-3 flex shrink-0 items-center justify-between border-t border-rule pt-3">
          <span className="tnum text-small text-ink-muted">{describeLines(totalTeeth, totalExtras)}</span>
          <span className="tnum font-display text-heading" data-testid="review-total">
            ${subtotal.toFixed(2)}
          </span>
        </div>

        {/* Said before the button, never after it. A total that moves
            without a reason given is how a student ends up feeling cheated;
            when the prices have not moved, this says nothing at all. */}
        {priceNotice && (
          <div
            className="mx-5 mt-3 shrink-0 rounded-control border border-ink bg-card-sunk px-3 py-2.5"
            role="status"
          >
            <p className="font-display text-body text-ink">Prices changed since you ordered.</p>
            <p className="tnum mt-0.5 text-small text-ink">
              Was ${priceNotice.was.toFixed(2)}, now ${priceNotice.now.toFixed(2)}.
            </p>
            <p className="tnum mt-1 text-caption text-ink-muted">
              {[
                ...priceNotice.moves.map(
                  (m) =>
                    `${m.toothType === "frasaco" ? "Frasaco" : "Copy A"} $${m.was.toFixed(2)} → $${m.now.toFixed(2)}`,
                ),
                ...(priceNotice.productMoves ?? []).map(
                  (m) => `${m.name} $${m.was.toFixed(2)} → $${m.now.toFixed(2)}`,
                ),
              ].join(" · ")}
            </p>
          </div>
        )}

        {/* An extra on the original order the seller no longer has. It is
            not on this order any more; the student should know before
            saving, not discover it at pickup. */}
        {goneNotice && goneNotice.length > 0 && (
          <div className="mx-5 mt-3 shrink-0 rounded-control border border-ink bg-card-sunk px-3 py-2.5" role="status">
            <p className="text-small text-ink">
              No longer available, so not on this order: {goneNotice.join(", ")}.
            </p>
          </div>
        )}

        {error && (
          <p
            className="mx-5 mt-3 shrink-0 border-l-2 border-ink bg-card-sunk py-2 pl-3 pr-2 text-small text-ink"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-4 flex shrink-0 gap-2 px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="pressable min-h-11 flex-1 rounded-control border border-rule py-3 font-display text-body text-ink-muted"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="pressable min-h-11 flex-[2] rounded-control bg-ink py-3 font-display text-body text-card disabled:opacity-50"
          >
            {mode === "edit"
              ? pending
                ? "Saving…"
                : "Save changes"
              : pending
                ? "Placing…"
                : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}
