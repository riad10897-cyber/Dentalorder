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
import { haptic } from "@/lib/haptics";

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

/**
 * Every sheet in the app: the tooth sheet, a product's sheet, the review.
 *
 * Enters on the drawer curve, leaves faster than it came, and can be
 * dragged or flicked down from its header at any point — including while
 * it is still arriving. One implementation, so all three move alike.
 *
 * `children` receives `dismiss`: buttons that simply close (Done, Back)
 * call it to slide the sheet away. Buttons whose result replaces the sheet
 * (Add to order) call their own handler and close at once.
 */
export function BottomSheet({
  label,
  header,
  children,
  onClose,
  className = "",
  zIndex = "z-40",
}: {
  label: string;
  header: React.ReactNode;
  children: (dismiss: () => void) => React.ReactNode;
  onClose: () => void;
  className?: string;
  zIndex?: string;
}) {
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
    // `thrown` marks a dismissal the user physically flicked away, as
    // opposed to tapping the scrim or Done. Only a thrown sheet gets a
    // haptic, and only when it lands.
    (velocity = 0, thrown = false) => {
      if (reduceMotion) {
        onClose();
        return;
      }
      const token = ++gestureToken.current;
      running.current?.stop();
      // Leaving is quicker than arriving: the student has already decided.
      running.current = animate(y, heightRef.current, {
        type: "spring",
        bounce: 0,
        duration: thrown ? 0.3 : 0.2,
        velocity,
        // onComplete does not fire on stop(), so grabbing a sheet that is
        // already on its way out cancels the close rather than having it
        // land underneath the finger. The token guards a double-dismiss.
        onComplete: () => {
          if (gestureToken.current !== token) return;
          // The landing is the visual event, so the tick belongs here
          // rather than at release — that is what makes it read as the
          // sheet hitting the bottom.
          if (thrown) haptic();
          onClose();
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
      dismiss(velocity, true);
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

  const close = () => dismiss();

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-end justify-center`}>
      <motion.div
        className="scrim absolute inset-0 bg-ink/45"
        style={reduceMotion ? undefined : { opacity: scrimOpacity }}
        onClick={close}
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`sheet-panel relative w-full max-w-md rounded-t-[0.75rem] bg-card pb-8 shadow-[0_-0.5rem_2rem_rgba(20,18,15,0.18)] ${className}`}
        style={reduceMotion ? undefined : { transform }}
      >
        {/* The entire header is the grab area. A handle-sized target is a
            nice idea that nobody can actually hit. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="shrink-0 cursor-grab touch-none px-5 pb-3 pt-3 active:cursor-grabbing"
        >
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-rule" />
          {header}
        </div>
        {children(close)}
      </motion.div>
    </div>
  );
}
