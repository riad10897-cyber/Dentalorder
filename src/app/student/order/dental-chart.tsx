"use client";

import { QUADRANT_TEETH } from "@/lib/teeth/fdi";
import type { ToothType } from "@/lib/supabase/types";

// Keyed by tooth number + type (not tooth number alone) so a student can
// order both Frasaco and Copy A for the same FDI position in one order.
export type ToothSelectionKey = `${number}:${ToothType}`;
export type ToothSelections = Record<ToothSelectionKey, { toothType: ToothType; quantity: number }>;

export function toothSelectionKey(toothNumber: number, toothType: ToothType): ToothSelectionKey {
  return `${toothNumber}:${toothType}`;
}

interface DentalChartProps {
  selections: ToothSelections;
  onTapTooth: (toothNumber: number) => void;
}

function chunk4(arr: number[]): [number[], number[]] {
  return [arr.slice(0, 4), arr.slice(4, 8)];
}

export function DentalChart({ selections, onTapTooth }: DentalChartProps) {
  return (
    <div className="mx-1 rounded-card border border-border bg-surface py-4">
      <div className="mb-4 px-3 text-center text-[11px] uppercase tracking-wide text-text-muted">
        Tap a tooth to add it to your order
      </div>

      <ArchRow
        leftLabel="Q1 (Upper Right)"
        rightLabel="Q2 (Upper Left)"
        leftQuadrant={QUADRANT_TEETH[1]}
        rightQuadrant={QUADRANT_TEETH[2]}
        mirrorLeft
        selections={selections}
        onTapTooth={onTapTooth}
      />

      <div className="mx-3 my-4 h-px bg-border" />

      <ArchRow
        leftLabel="Q4 (Lower Right)"
        rightLabel="Q3 (Lower Left)"
        leftQuadrant={QUADRANT_TEETH[4]}
        rightQuadrant={QUADRANT_TEETH[3]}
        mirrorLeft
        selections={selections}
        onTapTooth={onTapTooth}
      />
    </div>
  );
}

function ArchRow({
  leftLabel,
  rightLabel,
  leftQuadrant,
  rightQuadrant,
  mirrorLeft,
  selections,
  onTapTooth,
}: {
  leftLabel: string;
  rightLabel: string;
  leftQuadrant: number[];
  rightQuadrant: number[];
  mirrorLeft?: boolean;
  selections: ToothSelections;
  onTapTooth: (toothNumber: number) => void;
}) {
  return (
    <div className="flex justify-center gap-1">
      <QuadrantBlock
        label={leftLabel}
        teeth={leftQuadrant}
        mirror={mirrorLeft}
        selections={selections}
        onTapTooth={onTapTooth}
      />
      <QuadrantBlock label={rightLabel} teeth={rightQuadrant} selections={selections} onTapTooth={onTapTooth} />
    </div>
  );
}

function QuadrantBlock({
  label,
  teeth,
  mirror,
  selections,
  onTapTooth,
}: {
  label: string;
  teeth: number[];
  mirror?: boolean;
  selections: ToothSelections;
  onTapTooth: (toothNumber: number) => void;
}) {
  let [topRow, bottomRow] = chunk4(teeth);
  // Q1/Q4 read outward-to-midline (e.g. 14 13 12 11 | 21 22 23 24) so tooth
  // 11 sits next to 21 — the two central incisors meet at the midline, same
  // as a real dental chart.
  if (mirror) {
    topRow = [...topRow].reverse();
    bottomRow = [...bottomRow].reverse();
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-[179px] truncate text-center text-[10px] tracking-wide text-text-muted">{label}</div>
      <div className="grid grid-cols-4 gap-px">
        {topRow.map((n) => (
          <ToothButton key={n} toothNumber={n} selections={selections} onTap={onTapTooth} />
        ))}
        {bottomRow.map((n) => (
          <ToothButton key={n} toothNumber={n} selections={selections} onTap={onTapTooth} />
        ))}
      </div>
    </div>
  );
}

function ToothButton({
  toothNumber,
  selections,
  onTap,
}: {
  toothNumber: number;
  selections: ToothSelections;
  onTap: (toothNumber: number) => void;
}) {
  const frasaco = selections[toothSelectionKey(toothNumber, "frasaco")];
  const copyA = selections[toothSelectionKey(toothNumber, "copy_a")];
  const hasBoth = Boolean(frasaco) && Boolean(copyA);
  const combinedQty = (frasaco?.quantity ?? 0) + (copyA?.quantity ?? 0);

  return (
    <button
      type="button"
      aria-label={`Tooth ${toothNumber}`}
      onClick={() => onTap(toothNumber)}
      className={`relative flex h-11 w-11 flex-col items-center justify-center rounded-lg border transition-colors ${
        hasBoth
          ? "border-accent2 bg-accent2/10"
          : frasaco
            ? "border-accent bg-accent/10"
            : copyA
              ? "border-copy-a bg-copy-a/10"
              : "border-transparent bg-white/5"
      }`}
    >
      <span className="text-[13px] leading-none">🦷</span>
      <span
        className={`mt-0.5 font-heading text-[9px] font-bold leading-none ${
          hasBoth ? "text-accent2" : frasaco ? "text-accent" : copyA ? "text-copy-a" : "text-text-muted"
        }`}
      >
        {toothNumber}
      </span>
      {combinedQty > 0 && (
        <span
          className={`absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-bg ${
            hasBoth ? "bg-accent2" : frasaco ? "bg-accent" : "bg-copy-a"
          }`}
        >
          {combinedQty}
        </span>
      )}
    </button>
  );
}
