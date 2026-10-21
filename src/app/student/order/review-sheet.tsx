"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HelpLinks } from "@/app/_components/help-links";
import { useReducedMotion } from "motion/react";
import type { priceToothOrder } from "@/lib/orders/tooth-pricing";
import type { PriceMove, ProductPriceMove } from "@/lib/orders/price-change";
import type { PricedExtra } from "@/lib/orders/order-pricing";
import { haptic } from "@/lib/haptics";
import { BottomSheet, SheetTitle } from "./bottom-sheet";

const HOLD_MS = 1000;

export function ReviewSheet({
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
  repName: string | null;
  items: ReturnType<typeof priceToothOrder>["items"];
  extras?: PricedExtra[];
  subtotal: number;
  error: string | null;
  pending: boolean;
  mode?: "new" | "edit";
  /** Shown only when editing and the supplier's prices moved since the order. */
  priceNotice?: { moves: PriceMove[]; productMoves?: ProductPriceMove[]; was: number; now: number } | null;
  /** Extras on the earlier order the seller no longer has (editing, or Reorder). */
  goneNotice?: string[] | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const editing = mode === "edit";
  return (
    <BottomSheet
      label={editing ? "Review changes" : "Review order"}
      onClose={onClose}
      zIndex="z-50"
      className="flex max-h-[85vh] flex-col"
      header={
        <SheetTitle
          title={editing ? "Review changes" : "Review"}
          subtitle={repName ? `${repName} · pay at pickup` : "Pay at pickup"}
        />
      }
    >
      {() => (
        <>
          <ul className="mx-4 mt-2.5 max-h-[14.375rem] min-h-0 shrink overflow-y-auto rounded-button bg-fill-faint px-3.5 py-1">
            {items.map((item) => (
              <li
                key={`${item.toothNumber}:${item.toothType}`}
                className="flex items-center gap-2.5 border-b-[0.5px] border-separator py-2.5 last:border-none"
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: item.toothType === "frasaco" ? "var(--frasaco)" : "var(--copy-a)" }}
                />
                <span className="min-w-0 flex-1 truncate">
                  <span className="tnum text-[1rem] text-ink">Tooth {item.toothNumber}</span>{" "}
                  <span className="text-[0.875rem] text-ink-faint">
                    {item.toothType === "frasaco" ? "Frasaco" : "Copy A"}
                  </span>
                </span>
                <span className="tnum text-[0.875rem] text-ink-faint">×{item.quantity}</span>
                <span className="tnum w-16 text-right text-[1rem] font-semibold text-ink">
                  ${item.lineTotal.toFixed(2)}
                </span>
              </li>
            ))}
            {extras.map((extra) => (
              <li
                key={extra.productId}
                className="flex items-center gap-2.5 border-b-[0.5px] border-separator py-2.5 last:border-none"
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-[1rem] text-ink">{extra.name}</span>
                  {extra.unit && <span className="text-[0.875rem] text-ink-faint"> · {extra.unit}</span>}
                </span>
                <span className="tnum text-[0.875rem] text-ink-faint">×{extra.quantity}</span>
                <span className="tnum w-16 text-right text-[1rem] font-semibold text-ink">
                  ${extra.lineTotal.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex shrink-0 items-baseline justify-between px-[1.375rem] pt-3.5">
            <span className="text-list-secondary text-ink-faint">Total · locked when placed</span>
            <span className="tnum text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-ink" data-testid="review-total">
              ${subtotal.toFixed(2)}
            </span>
          </div>

          {/* Said before the button, never after it. A total that moves
              without a reason given is how a student ends up feeling
              cheated; when the prices have not moved, this says nothing. */}
          {priceNotice && (
            <div className="mx-4 mt-3 shrink-0 rounded-button bg-fill-faint px-3.5 py-3" role="status">
              <p className="text-native-body font-semibold text-ink">Prices changed since you ordered.</p>
              <p className="tnum mt-0.5 text-list-secondary text-ink">
                Was ${priceNotice.was.toFixed(2)}, now ${priceNotice.now.toFixed(2)}.
              </p>
              <p className="tnum mt-1 text-native-caption text-ink-muted">
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

          {/* An extra on the earlier order the seller no longer has. It is
              not on this order; the student should know before placing,
              not discover it at pickup. */}
          {goneNotice && goneNotice.length > 0 && (
            <div className="mx-4 mt-3 shrink-0 rounded-button bg-fill-faint px-3.5 py-3" role="status">
              <p className="text-list-secondary text-ink">
                No longer available, so not on this order: {goneNotice.join(", ")}.
              </p>
            </div>
          )}

          {error && (
            <div className="mx-4 mt-3 shrink-0 rounded-button bg-fill-faint px-3.5 py-3" role="alert">
              <p className="text-list-secondary text-ink">{error}</p>
              <HelpLinks topic="placing an order" className="mt-1" />
            </div>
          )}

          <div className="shrink-0 px-4 pt-4">
            <HoldToPlace
              label={editing ? "Hold to save changes" : `Hold to place · $${subtotal.toFixed(2)}`}
              actionName={editing ? "Save changes" : `Place order, $${subtotal.toFixed(2)}`}
              pendingLabel={editing ? "Saving…" : "Placing…"}
              pending={pending}
              onConfirm={onConfirm}
            />
          </div>
        </>
      )}
    </BottomSheet>
  );
}

/**
 * Press and hold for a second to place the order: the moment it becomes
 * real is deliberate. A green fill sweeps across while held (linear, as
 * the time it shows is linear); let go early and it drains back in 220ms.
 *
 * Keyboard and assistive technology: Enter or Space places the order at
 * once (a click with no pointer, detail 0). VoiceOver users can also
 * double-tap and hold. Under reduced motion the fill fades in instead of
 * sweeping.
 */
function HoldToPlace({
  label,
  actionName,
  pendingLabel,
  pending,
  onConfirm,
}: {
  label: string;
  actionName: string;
  pendingLabel: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintId = useId();

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function start(event: React.PointerEvent) {
    if (pending || timer.current) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      haptic();
      onConfirm();
    }, HOLD_MS);
  }

  function cancel() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setHolding(false);
  }

  const fillStyle: React.CSSProperties = reduceMotion
    ? {
        transform: "scaleX(1)",
        opacity: holding ? 1 : 0,
        transition: holding ? `opacity ${HOLD_MS}ms linear` : "opacity 220ms var(--ease-out)",
      }
    : {
        transform: holding ? "scaleX(1)" : "scaleX(0)",
        transition: holding ? `transform ${HOLD_MS}ms linear` : "transform 220ms var(--ease-out)",
      };

  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-label={actionName}
        aria-describedby={hintId}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          // A click with no pointer behind it: the keyboard, or a screen
          // reader's activate. No hold for those.
          if (e.detail === 0 && !pending) onConfirm();
        }}
        className="relative flex h-14 w-full touch-manipulation select-none items-center justify-center overflow-hidden rounded-[1.125rem] bg-ink text-native-body font-semibold text-card [-webkit-touch-callout:none] disabled:opacity-70"
      >
        <span aria-hidden className="absolute inset-0 origin-left bg-fulfilled" style={fillStyle} />
        <span className="tnum relative">{pending ? pendingLabel : holding ? "Keep holding…" : label}</span>
      </button>
      <span id={hintId} className="sr-only">
        Press and hold for one second, or press Enter.
      </span>
    </>
  );
}
