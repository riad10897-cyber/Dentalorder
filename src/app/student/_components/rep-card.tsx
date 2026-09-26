"use client";

import { useState } from "react";
import { RepPicker } from "./rep-picker";
import type { AvailableRep } from "@/lib/student/data";

/**
 * The student's current rep, with a way to change it.
 *
 * The picker was previously rendered only when a student had no rep, which
 * meant the choice was made once at sign-up and could never be revised from
 * inside the app — a rep who graduated, or a wrong pick, needed someone
 * editing the database by hand. The server action always supported the
 * switch; nothing ever offered it.
 */
export function RepCard({
  repName,
  frasacoPrice,
  copyAPrice,
  currentRepId,
  reps,
  university,
}: {
  repName: string;
  frasacoPrice: number;
  copyAPrice: number;
  currentRepId: string;
  reps: AvailableRep[];
  university: string | null;
}) {
  const [changing, setChanging] = useState(false);

  if (changing) {
    return (
      <div className="rounded-card border border-rule bg-card p-4">
        <div className="text-micro uppercase text-ink-faint">Change representative</div>
        <p className="mb-3 mt-1 text-caption text-ink-muted">
          You order from {repName} today.
        </p>
        <RepPicker
          reps={reps}
          university={university}
          currentRepId={currentRepId}
          onCancel={() => setChanging(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3.5 rounded-card border border-rule bg-card p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink/20 text-lg">
        👤
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-micro uppercase text-ink-faint">Your Representative</div>
        <div className="truncate font-display text-[15px] font-bold">{repName}</div>
        <div className="tnum mt-0.5 text-xs text-ink-muted">
          Frasaco ${frasacoPrice.toFixed(2)} · Copy A ${copyAPrice.toFixed(2)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setChanging(true)}
        className="pressable -mr-1 min-h-11 shrink-0 rounded-control px-3 font-display text-small text-ink underline underline-offset-2"
      >
        Change
      </button>
    </div>
  );
}
