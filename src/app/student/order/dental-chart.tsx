"use client";

import { useEffect, useState } from "react";
import { CHART_ROWS } from "@/lib/teeth/fdi";
import { toothSelectionKey, type ToothSelections } from "@/lib/teeth/selection";

// Re-exported so existing client imports keep working.
export { toothSelectionKey };
export type { ToothSelectionKey, ToothSelections } from "@/lib/teeth/selection";

interface DentalChartProps {
  selections: ToothSelections;
  frasacoPrice: number;
  copyAPrice: number;
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

export function DentalChart({
  selections,
  frasacoPrice,
  copyAPrice,
  onTapTooth,
}: DentalChartProps) {
  const [arrive] = useState(() => !chartArrived);
  useEffect(() => {
    chartArrived = true;
  }, []);

  return (
    <div className="mx-2 rounded-card border border-rule bg-card px-2 py-4">
      <ColourKey frasacoPrice={frasacoPrice} copyAPrice={copyAPrice} />

      <ArchLabel>Upper</ArchLabel>
      {CHART_ROWS.slice(0, 2).map((row, i) => (
        <ArchRow key={i} row={row} rowIndex={i} arrive={arrive} selections={selections} onTapTooth={onTapTooth} />
      ))}

      <div className="my-2 flex items-center gap-2 px-1" aria-hidden="true">
        <span className="h-px flex-1 bg-rule" />
        <span className="text-micro uppercase text-ink-faint">Midline</span>
        <span className="h-px flex-1 bg-rule" />
      </div>

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
      <ArchLabel>Lower</ArchLabel>
    </div>
  );
}

function ColourKey({ frasacoPrice, copyAPrice }: { frasacoPrice: number; copyAPrice: number }) {
  return (
    <div className="mb-3 flex items-center justify-center gap-4 px-1 text-caption text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-frasaco" />
        Frasaco <span className="tnum font-display text-ink">${frasacoPrice.toFixed(2)}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-copy-a" />
        Copy A <span className="tnum font-display text-ink">${copyAPrice.toFixed(2)}</span>
      </span>
    </div>
  );
}

function ArchLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-1 py-1 text-center text-micro uppercase text-ink-faint">{children}</div>
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
    backgroundColor = "var(--card)";
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
      <span
        className={`tooth-face relative flex items-center justify-center rounded-control border ${
          selected ? "border-transparent" : "border-rule"
        }`}
        style={{
          backgroundColor,
          backgroundImage,
          width: `${TOOTH_W}px`,
          height: `${TOOTH_H}px`,
        }}
      >
        <span
          className={`tnum font-display text-caption ${
            selected ? "text-card" : "text-ink-faint"
          }`}
        >
          {toothNumber}
        </span>
        {combinedQty > 1 && (
          <span className="tooth-badge tnum absolute -right-1 -top-1 flex h-[1.0625rem] min-w-[1.0625rem] items-center justify-center rounded-full bg-ink px-1 font-display text-[0.625rem] leading-none text-card">
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
