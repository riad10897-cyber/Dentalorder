"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import { TOOTH_NAMES } from "@/lib/teeth/fdi";

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
const DISMISS_FRACTION = 0.45;

// Apple's momentum projection (Designing Fluid Interfaces). Not the
// textbook v²/2a — this is the exponential-decay form that matches how
// iOS scroll actually decelerates, so a flick lands where it looks like
// it should.
function projectMomentum(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Progressive resistance past a boundary. Real things slow before they
// stop; a hard stop reads as frozen rather than as "there's nothing more
// here".
function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

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
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const heightRef = useRef(1);

  const running = useRef<AnimationPlaybackControls | null>(null);
  // Every new gesture invalidates any in-flight dismissal, so grabbing a
  // sheet that is already on its way out cancels the close instead of
  // letting the old animation's completion fire underneath the finger.
  const gestureToken = useRef(0);
  const grab = useRef<{ pointerY: number; startOffset: number } | null>(null);
  const history = useRef<{ t: number; y: number }[]>([]);

  // Full transform string rather than Motion's `y` shorthand: the
  // shorthand runs on the main thread and drops frames under load.
  const transform = useTransform(y, (value) => `translateY(${value}px)`);
  const scrimOpacity = useTransform(y, (value) =>
    Math.max(0, Math.min(1, 1 - value / heightRef.current)),
  );

  // Enter on the drawer curve. Interruptible by design: a grab stops this
  // and starts tracking from wherever the panel actually is on screen.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    heightRef.current = panel.offsetHeight || 1;
    if (reduceMotion) return;

    y.set(heightRef.current);
    running.current = animate(y, 0, { duration: 0.3, ease: [0.32, 0.72, 0, 1] });
    return () => running.current?.stop();
    // Mount only — re-running would replay the entrance mid-use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(
    (velocity = 0) => {
      if (reduceMotion) {
        onClose();
        return;
      }
      const token = ++gestureToken.current;
      running.current?.stop();
      running.current = animate(y, heightRef.current, {
        type: "spring",
        bounce: 0,
        duration: 0.3,
        velocity,
        // onComplete does not fire on stop(), so grabbing a sheet that is
        // already on its way out cancels the close rather than having it
        // land underneath the finger. The token guards a double-dismiss.
        onComplete: () => {
          if (gestureToken.current === token) onClose();
        },
      });
    },
    [onClose, reduceMotion, y],
  );

  // Keyboard-initiated actions get no animation — Escape is pressed far
  // too often for motion on it to read as anything but latency.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function onPointerDown(event: React.PointerEvent) {
    if (reduceMotion) return;
    // Ignore extra touches once a drag is under way, or the panel jumps
    // to whichever finger moved last.
    if (grab.current) return;
    gestureToken.current++;
    running.current?.stop();
    event.currentTarget.setPointerCapture(event.pointerId);
    grab.current = { pointerY: event.clientY, startOffset: y.get() };
    history.current = [{ t: performance.now(), y: y.get() }];
  }

  function onPointerMove(event: React.PointerEvent) {
    const start = grab.current;
    if (!start) return;
    // Respect both where it was grabbed and where it was when grabbed, so
    // an interrupted entrance keeps following the finger 1:1.
    const raw = start.startOffset + (event.clientY - start.pointerY);
    const next = raw < 0 ? -rubberband(-raw, heightRef.current) : raw;
    y.set(next);
    history.current.push({ t: performance.now(), y: next });
    if (history.current.length > 6) history.current.shift();
  }

  function onPointerUp() {
    if (!grab.current) return;
    grab.current = null;

    const samples = history.current;
    const last = samples[samples.length - 1];
    const first = samples.length > 1 ? samples[0] : null;
    const elapsed = first ? last.t - first.t : 0;
    const velocity = first && elapsed > 0 ? ((last.y - first.y) / elapsed) * 1000 : 0;

    // Animate to where the gesture was going, not to where the finger
    // happened to leave off. A flick should throw the sheet.
    const projected = y.get() + projectMomentum(velocity);

    if (projected > heightRef.current * DISMISS_FRACTION) {
      dismiss(velocity);
    } else {
      gestureToken.current++;
      running.current?.stop();
      // Bounce only because a real flick preceded it; a sheet that just
      // faded in should never overshoot.
      running.current = animate(y, 0, {
        type: "spring",
        bounce: 0.2,
        duration: 0.4,
        velocity,
      });
    }
  }

  const positionSubtotal = frasacoQty * frasacoPrice + copyQty * copyAPrice;
  const combinedQty = frasacoQty + copyQty;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <motion.div
        className="scrim absolute inset-0 bg-ink/45"
        style={reduceMotion ? undefined : { opacity: scrimOpacity }}
        onClick={() => dismiss()}
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tooth ${toothNumber} options`}
        className="sheet-panel relative w-full max-w-md rounded-t-[0.75rem] bg-card pb-8 shadow-[0_-0.5rem_2rem_rgba(20,18,15,0.18)]"
        style={reduceMotion ? undefined : { transform }}
      >
        {/* The entire header is the grab area. A handle-sized target is a
            nice idea that nobody can actually hit. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="cursor-grab touch-none px-5 pb-4 pt-3 active:cursor-grabbing"
        >
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-rule" />
          <div className="font-display text-title">Tooth {toothNumber}</div>
          <div className="text-small text-ink-muted">{TOOTH_NAMES[toothNumber]}</div>
        </div>

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
      </motion.div>
    </div>
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
