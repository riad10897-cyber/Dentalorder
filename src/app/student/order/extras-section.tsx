"use client";

import { useState } from "react";
import { PRODUCT_CATEGORIES } from "@/lib/products/categories";
import type { ProductCategorySlug } from "@/lib/products/categories";
import { ProductSheet } from "./product-sheet";

export interface ExtraOption {
  productId: string;
  name: string;
  unit: string | null;
  brand: string | null;
  description: string | null;
  price: number;
  category: ProductCategorySlug;
}

/** Past this many products, category chips go above the list. */
const CHIPS_FROM = 9;

/**
 * "Also from Majzoub": the seller's in-stock products, under the chart.
 *
 * Only what this seller sells right now — the list is read fresh when the
 * screen loads, and it is the same list the database will price against.
 * A pill stepper per product, starting at zero. No section at all when the
 * seller has listed nothing: an empty box under every chart would be noise.
 *
 * Tapping a product's name opens a sheet with what the seller wrote about
 * it. With more than eight products, category chips narrow the list.
 * Products arrive in shelf order (category, then name), so the one inset
 * list still reads by category.
 */
export function ExtrasSection({
  supplierName,
  options,
  quantities,
  onChange,
}: {
  supplierName: string;
  options: ExtraOption[];
  quantities: Record<string, number>;
  onChange: (productId: string, quantity: number) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProductCategorySlug | null>(null);
  if (options.length === 0) return null;

  const open = options.find((o) => o.productId === openId) ?? null;
  const categories = PRODUCT_CATEGORIES.filter((c) => options.some((o) => o.category === c.slug));
  const showChips = options.length >= CHIPS_FROM && categories.length > 1;
  const listed = showChips && filter ? options.filter((o) => o.category === filter) : options;
  const firstName = supplierName.split(/\s+/)[0] || supplierName;

  return (
    <section aria-label={`Extras from ${supplierName}`}>
      <h2 className="mx-5 mb-1.5 mt-[1.375rem] text-native-caption uppercase tracking-[0.02em] text-ink-faint">
        Also from {firstName}
      </h2>
      {showChips && (
        <div className="mb-2 flex gap-2 overflow-x-auto px-4 py-1.5" role="group" aria-label="Category">
          <Chip label="All" selected={filter === null} onClick={() => setFilter(null)} />
          {categories.map((c) => (
            <Chip key={c.slug} label={c.name} selected={filter === c.slug} onClick={() => setFilter(c.slug)} />
          ))}
        </div>
      )}
      <ul className="mx-4 overflow-hidden rounded-group bg-card">
        {listed.map((option, i) => {
          const qty = quantities[option.productId] ?? 0;
          return (
            <li
              key={option.productId}
              className={`flex items-center gap-3 px-3.5 py-2.5 ${
                i < listed.length - 1 ? "border-b-[0.5px] border-separator" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(option.productId)}
                aria-label={`${option.name}, details`}
                className="flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
              >
                <span className="truncate text-[1rem] leading-snug text-ink">{option.name}</span>
                <span className="tnum truncate text-native-caption text-ink-faint">
                  {[option.brand, `$${option.price.toFixed(2)}`, option.unit].filter(Boolean).join(" · ")}
                </span>
              </button>
              <PillStepper name={option.name} value={qty} onChange={(next) => onChange(option.productId, next)} />
            </li>
          );
        })}
      </ul>
      {open && (
        <ProductSheet
          option={open}
          quantity={quantities[open.productId] ?? 0}
          onChange={(q) => onChange(open.productId, q)}
          onClose={() => setOpenId(null)}
        />
      )}
    </section>
  );
}

/**
 * − count +, as a capsule. Each button is drawn 38 wide and reaches a
 * 44×44 target through an invisible, larger hit area.
 */
export function PillStepper({
  name,
  value,
  onChange,
  max = 10,
  height = "h-8",
  surface = "bg-fill",
  countClass = "text-list-secondary",
}: {
  name: string;
  value: number;
  onChange: (next: number) => void;
  max?: number;
  height?: string;
  surface?: string;
  countClass?: string;
}) {
  return (
    <span className={`flex shrink-0 items-center rounded-full ${height} ${surface}`}>
      <StepButton label={`One fewer ${name}`} disabled={value <= 0} onClick={() => onChange(value - 1)}>
        −
      </StepButton>
      <span
        className={`tnum min-w-4 text-center font-semibold ${countClass} ${value ? "text-ink" : "text-ink-faint"}`}
        aria-live="polite"
        aria-label={`${name}: ${value}`}
      >
        {value}
      </span>
      <StepButton label={`One more ${name}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </StepButton>
    </span>
  );
}

function StepButton({
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
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pressable relative flex h-full w-[2.375rem] items-center justify-center text-[1.125rem] text-ink after:absolute after:-inset-x-[0.1875rem] after:-inset-y-1.5 after:content-[''] disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`pressable relative h-8 shrink-0 rounded-full px-3.5 text-list-secondary font-medium after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-[''] ${
        selected ? "bg-ink text-card" : "bg-fill text-ink"
      }`}
    >
      {label}
    </button>
  );
}
