"use client";

import type { ToothType } from "@/lib/supabase/types";

/**
 * Frasaco or Copy A: the type a newly tapped tooth starts as. A segmented
 * control with a sliding thumb (320ms on the drawer curve, transform only;
 * no slide under reduced motion). It names both types and both prices,
 * which is all the chart's colours need to be read.
 */
export function TypeSwitch({
  value,
  onChange,
  frasacoPrice,
  copyAPrice,
}: {
  value: ToothType;
  onChange: (next: ToothType) => void;
  frasacoPrice: number;
  copyAPrice: number;
}) {
  const options: { type: ToothType; label: string; price: number; dot: string }[] = [
    { type: "frasaco", label: "Frasaco", price: frasacoPrice, dot: "var(--frasaco)" },
    { type: "copy_a", label: "Copy A", price: copyAPrice, dot: "var(--copy-a)" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Tooth type for new teeth"
      className="relative mx-4 flex h-[2.125rem] rounded-track bg-fill p-0.5"
    >
      <span
        aria-hidden
        className="absolute bottom-0.5 left-0.5 top-0.5 w-[calc(50%-0.125rem)] rounded-thumb bg-card shadow-thumb transition-transform duration-[320ms] ease-[var(--ease-drawer)] motion-reduce:transition-none"
        style={{ transform: value === "frasaco" ? "translateX(0)" : "translateX(100%)" }}
      />
      {options.map((option) => (
        <button
          key={option.type}
          type="button"
          role="radio"
          aria-checked={value === option.type}
          onClick={() => onChange(option.type)}
          className="relative flex flex-1 items-center justify-center gap-1.5 text-[0.875rem] font-semibold text-ink"
        >
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: option.dot }} />
          {option.label} <span className="tnum">${option.price.toFixed(2)}</span>
        </button>
      ))}
    </div>
  );
}
