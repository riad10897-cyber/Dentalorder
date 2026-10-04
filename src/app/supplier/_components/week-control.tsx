"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCurrentWeek } from "../_actions/orders";

/**
 * "Week 4 of 17", with − and +. The week moves on by itself every
 * Saturday at 1:00 PM; the buttons are for putting it right (the first
 * week of a semester, a holiday). Shown at once, put back if the save
 * fails.
 */
export function WeekControl({ week, nextSwitch }: { week: number; nextSwitch: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useState(week);
  const [error, setError] = useState<string | null>(null);

  function change(next: number) {
    if (next < 1 || next > 17) return;
    const before = shown;
    setShown(next);
    setError(null);
    startTransition(async () => {
      const result = await setCurrentWeek(next);
      if (!result.ok) {
        setShown(before);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous week"
          disabled={pending || shown <= 1}
          onClick={() => change(shown - 1)}
          className="pressable flex h-11 w-11 items-center justify-center rounded-control border border-rule bg-card font-display text-lead disabled:opacity-30"
        >
          −
        </button>
        <p className="min-w-[7.5rem] text-center" aria-live="polite">
          <span className="block text-micro uppercase text-ink-faint">Taking orders for</span>
          <span className="font-display text-body text-ink">
            Week <span className="tnum">{shown}</span>
            <span className="text-ink-muted"> of 17</span>
          </span>
        </p>
        <button
          type="button"
          aria-label="Next week"
          disabled={pending || shown >= 17}
          onClick={() => change(shown + 1)}
          className="pressable flex h-11 w-11 items-center justify-center rounded-control border border-rule bg-card font-display text-lead disabled:opacity-30"
        >
          +
        </button>
      </div>
      <p className="text-caption text-ink-muted">
        {shown < 17
          ? <>Moves to week <span className="tnum">{shown + 1}</span> on {nextSwitch}.</>
          : "Last week of the semester. Set week 1 when the next one starts."}
      </p>
      {error && (
        <p className="text-caption text-ink" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
