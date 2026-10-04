"use client";

import type { priceToothOrder } from "@/lib/orders/tooth-pricing";
import type { PriceMove, ProductPriceMove } from "@/lib/orders/price-change";
import type { PricedExtra } from "@/lib/orders/order-pricing";
import { describeLines } from "@/app/_components/extras-lines";
import { BottomSheet } from "./bottom-sheet";

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
  const totalTeeth = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalExtras = extras.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <BottomSheet
      label={mode === "edit" ? "Review changes" : "Review order"}
      onClose={onClose}
      zIndex="z-50"
      className="flex max-h-[85vh] flex-col"
      header={
        <>
          <div className="font-display text-title">{mode === "edit" ? "Review changes" : "Review order"}</div>
          <div className="text-small text-ink-muted">
            Week {week}
            {repName ? ` · to ${repName}` : ""}
          </div>
        </>
      }
    >
      {(dismiss) => (
        <>
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
              onClick={dismiss}
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
        </>
      )}
    </BottomSheet>
  );
}
