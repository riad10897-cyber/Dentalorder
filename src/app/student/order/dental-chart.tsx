"use client";

import { useEffect, useState } from "react";
import { CHART_ROWS } from "@/lib/teeth/fdi";
import { toothSelectionKey, type ToothSelections } from "@/lib/teeth/selection";

// Re-exported so existing client imports keep working.
export { toothSelectionKey };
export type { ToothSelectionKey, ToothSelections } from "@/lib/teeth/selection";

interface DentalChartProps {
  selections: ToothSelections;
  onTapTooth: (toothNumber: number) => void;
}

// The chart is a fixed-geometry anatomical diagram, not text, so its cell
// sizes are deliberately in px and do not scale with the reader's text
// size — 32 cells across cannot survive being scaled 150% at 375px, and
// an arch that reflows stops being a dental chart. Text inside it still
// scales, and every other measurement in the app is in rem.
const CELL_W = 36;
const CELL_H = 48;
const GUTTER = 6;
const TOOTH_W = 34;
const TOOTH_H = 42;

// Columns sit on a shallow parabola so each row reads as an arch: no dip
// at the midline, ~12px at the outer molars. Upper rows dip down at the
// edges, lower rows dip up.
const MAX_DIP = 12;

function columnDip(columnIndex: number, arch: "upper" | "lower"): string {
  const fromMidline = (columnIndex - 3.5) / 3.5;
  const dip = MAX_DIP * fromMidline * fromMidline;
  return `${arch === "upper" ? dip : -dip}px`;
}

// The rows rise in once per visit to the app, not every time the order
// screen opens: a student who goes back to the market and picks another
// seller has already seen the chart arrive, and waiting for it again is
// just delay. Lives in the module, so it lasts until the page is
// reloaded. The server never sets it, so a fresh load always animates and
// the first render matches on both sides.
let chartArrived = false;

export function DentalChart({ selections, onTapTooth }: DentalChartProps) {
  const [arrive] = useState(() => !chartArrived);
  useEffect(() => {
    chartArrived = true;
  }, []);

  // "Paper, native": the chart is a card of its own, with no key, labels
  // or midline rule — the type switch above names the colours, and a gap
  // between the arches gives the lower arch's dip its room.
  return (
    <div className="mx-2 select-none rounded-chart bg-card px-2 pb-[1.125rem] pt-4 [-webkit-user-select:none]">
      {CHART_ROWS.slice(0, 2).map((row, i) => (
        <ArchRow key={i} row={row} rowIndex={i} arrive={arrive} selections={selections} onTapTooth={onTapTooth} />
      ))}

      <div aria-hidden className="h-[1.875rem]" />

      {CHART_ROWS.slice(2).map((row, i) => (
        <ArchRow
          key={i + 2}
          row={row}
          rowIndex={i + 2}
          arrive={arrive}
          selections={selections}
          onTapTooth={onTapTooth}
        />
      ))}
    </div>
  );
}

function ArchRow({
  row,
  rowIndex,
  arrive,
  selections,
  onTapTooth,
}: {
  row: { arch: "upper" | "lower"; teeth: number[] };
  rowIndex: number;
  arrive: boolean;
  selections: ToothSelections;
  onTapTooth: (toothNumber: number) => void;
}) {
  return (
    <div
      className={`${arrive ? "arch-row " : ""}flex justify-center`}
      style={{ "--row-index": rowIndex, gap: `${GUTTER}px` } as React.CSSProperties}
    >
      {row.teeth.map((toothNumber, columnIndex) => (
        <ToothButton
          key={toothNumber}
          toothNumber={toothNumber}
          dip={columnDip(columnIndex, row.arch)}
          selections={selections}
          onTap={onTapTooth}
        />
      ))}
    </div>
  );
}

function ToothButton({
  toothNumber,
  dip,
  selections,
  onTap,
}: {
  toothNumber: number;
  dip: string;
  selections: ToothSelections;
  onTap: (toothNumber: number) => void;
}) {
  const frasaco = selections[toothSelectionKey(toothNumber, "frasaco")];
  const copyA = selections[toothSelectionKey(toothNumber, "copy_a")];
  const hasBoth = Boolean(frasaco) && Boolean(copyA);
  const combinedQty = (frasaco?.quantity ?? 0) + (copyA?.quantity ?? 0);

  // Every tooth is the same silhouette at every state — colour and the
  // badge carry all of the meaning.
  // Colour and gradient are set separately rather than through the
  // `background` shorthand: a shorthand cannot transition from a colour to
  // a gradient, and the colour is what has to animate. The both-types
  // gradient rides on top as an image and simply appears — it is 4 orders
  // in 286, and not worth crossfading two layers for.
  let backgroundColor: string;
  if (frasaco) {
    backgroundColor = "var(--frasaco)";
  } else if (copyA) {
    backgroundColor = "var(--copy-a)";
  } else {
    backgroundColor = "rgba(20, 18, 15, 0.06)";
  }
  const backgroundImage = hasBoth
    ? "linear-gradient(135deg, var(--frasaco) 0 50%, var(--copy-a) 50% 100%)"
    : "none";

  const selected = Boolean(frasaco || copyA);

  return (
    <button
      type="button"
      aria-label={`Tooth ${toothNumber}${describe(frasaco?.quantity, copyA?.quantity)}`}
      onClick={() => onTap(toothNumber)}
      // Tap target is the full 36x48 cell, not the drawn 34x42 tooth
      // inside it.
      className="tooth-cell flex shrink-0 items-center justify-center"
      style={
        { "--dip": dip, width: `${CELL_W}px`, height: `${CELL_H}px` } as React.CSSProperties
      }
    >
      {/* Unselected teeth sit a little smaller and grow into place when
          picked (.tooth-face, on the spring-pop curve). */}
      <span
        className={`tooth-face relative flex items-center justify-center rounded-tooth ${
          selected ? "scale-100" : "scale-[0.92]"
        }`}
        style={{
          backgroundColor,
          backgroundImage,
          width: `${TOOTH_W}px`,
          height: `${TOOTH_H}px`,
        }}
      >
        <span
          className={`tnum text-[0.75rem] font-semibold ${selected ? "text-white" : "text-ink-faint"}`}
        >
          {toothNumber}
        </span>
        {combinedQty > 1 && (
          <span className="tooth-badge tnum absolute -right-[0.3125rem] -top-[0.3125rem] flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 border-card bg-ink px-1 text-[0.625rem] font-semibold leading-none text-white">
            {combinedQty}
          </span>
        )}
      </span>
    </button>
  );
}

function describe(frasacoQty?: number, copyAQty?: number): string {
  const parts: string[] = [];
  if (frasacoQty) parts.push(`${frasacoQty} Frasaco`);
  if (copyAQty) parts.push(`${copyAQty} Copy A`);
  return parts.length ? `, ${parts.join(" and ")} selected` : "";
}
