"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCurrentWeek } from "../_actions/orders";

/**
 * "Week 5 of 17", with − and +, as an inset card ("Paper, native"): the
 * week these orders are FOR. Sellers are students too, so during week 4
 * they take orders for week 5. It moves on by itself every Saturday at
 * 1:00 PM; the buttons are for
 * putting it right (the first week of a semester, a holiday). Shown at
 * once, put back if the save fails. `footnote` sits under the week, on
 * the card's lower row (how many students have ordered).
 */
export function WeekControl({
  week,
  nextSwitch,
  footnote,
}: {
  week: number;
  nextSwitch: string;
  footnote?: React.ReactNode;
}) {
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
    <section aria-label="Ordering week" className="rounded-group bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p aria-live="polite" className="min-w-0">
          <span className="block text-native-caption text-ink-faint">Taking orders for</span>
          <span className="text-[1.375rem] font-bold leading-tight tracking-[-0.015em] text-ink">
            Week <span className="tnum">{shown}</span>
            <span className="font-normal text-ink-faint"> of 17</span>
          </span>
        </p>
        <span className="flex h-9 shrink-0 items-center rounded-full bg-fill">
          <WeekButton label="Previous week" disabled={pending || shown <= 1} onClick={() => change(shown - 1)}>
            −
          </WeekButton>
          <span aria-hidden className="h-4 w-[0.5px] bg-separator" />
          <WeekButton label="Next week" disabled={pending || shown >= 17} onClick={() => change(shown + 1)}>
            +
          </WeekButton>
        </span>
      </div>
      <div className="border-t-[0.5px] border-separator px-4 py-2.5 text-native-caption text-ink-muted">
        {footnote && <p className="text-ink">{footnote}</p>}
        <p>
          {shown < 17
            ? <>Moves to week <span className="tnum">{shown + 1}</span> on {nextSwitch}.</>
            : "Last week of the semester. Set week 1 when the next one starts."}
        </p>
        {error && (
          <p className="mt-1 text-ink" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

function WeekButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // 36px drawn, 48px to the finger: the ::after reaches past the pill.
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pressable relative flex h-full w-12 items-center justify-center text-[1.25rem] text-ink after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-[''] disabled:opacity-30"
    >
      {children}
    </button>
  );
}
