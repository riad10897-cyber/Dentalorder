"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * Counts a money figure to its new value instead of swapping it.
 *
 * Returns a ref to put on the element that holds the figure. The animation
 * writes `textContent` directly rather than going through state, so adding
 * a tooth costs one render — not sixty. On a mid-range phone that is the
 * difference between a running total that counts and one that stutters.
 *
 * Interruptible by construction: each change stops the animation in flight
 * and starts a new one from the value actually on screen, so a student
 * tapping twelve teeth quickly sees the number chase them rather than
 * queueing twelve animations. It always lands on the exact figure — a
 * total that settled a cent out would be worse than no animation at all.
 */
export function useCountingMoney(value: number) {
  const ref = useRef<HTMLElement>(null);
  const shown = useRef(value);
  const running = useRef<ReturnType<typeof animate> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const write = (n: number) => {
      el.textContent = `$${n.toFixed(2)}`;
    };

    // Reduced motion still needs the number to be right; it just gets
    // there without the count.
    if (reduceMotion) {
      shown.current = value;
      write(value);
      return;
    }

    running.current?.stop();
    running.current = animate(shown.current, value, {
      duration: 0.25,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (n) => {
        shown.current = n;
        write(n);
      },
      onComplete: () => {
        shown.current = value;
        write(value);
      },
    });

    return () => running.current?.stop();
  }, [value, reduceMotion]);

  return ref;
}
