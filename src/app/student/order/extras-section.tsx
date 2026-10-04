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
 * "Extras from Riad": the seller's in-stock products, under the chart.
 *
 * Only what this seller sells right now — the list is read fresh when the
 * screen loads, and it is the same list the database will price against.
 * A stepper per product, starting at zero. No section at all when the
 * seller has listed nothing: an empty "Extras" box under every chart would
 * be noise.
 *
 * Tapping a product opens a sheet with what the seller wrote about it.
 * With more than eight products, category chips narrow the list.
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
  const shown = showChips && filter ? categories.filter((c) => c.slug === filter) : categories;

  return (
    <section className="mx-2 mt-3 rounded-card border border-rule bg-card" aria-label={`Extras from ${supplierName}`}>
      <h2 className="border-b border-hairline px-4 py-3 font-display text-body">Extras from {supplierName}</h2>
      {showChips && (
        <div className="flex gap-2 overflow-x-auto border-b border-hairline px-4 py-2.5" role="group" aria-label="Category">
          <Chip label="All" selected={filter === null} onClick={() => setFilter(null)} />
          {categories.map((c) => (
            <Chip key={c.slug} label={c.name} selected={filter === c.slug} onClick={() => setFilter(c.slug)} />
          ))}
        </div>
      )}
      {shown.map((category) => {
        const inCategory = options.filter((o) => o.category === category.slug);
        if (inCategory.length === 0) return null;
        return (
          <div key={category.slug}>
            <p className="px-4 pb-1 pt-3 text-micro uppercase text-ink-faint">{category.name}</p>
            <ul>
              {inCategory.map((option) => {
                const qty = quantities[option.productId] ?? 0;
                return (
                  <li
                    key={option.productId}
                    className="flex items-center gap-3 border-b border-hairline px-4 py-2 last:border-none"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(option.productId)}
                      aria-label={`${option.name}, details`}
                      className="pressable flex min-h-11 min-w-0 flex-1 items-center gap-1.5 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body text-ink">{option.name}</span>
                        <span className="tnum block truncate text-caption text-ink-muted">
                          {[option.brand, `$${option.price.toFixed(2)}`, option.unit].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <svg
                        aria-hidden
                        className="h-4 w-4 shrink-0 text-ink-faint"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                    <span className="flex shrink-0 items-center gap-1">
                      <Stepper
                        label={`One fewer ${option.name}`}
                        symbol="−"
                        disabled={qty === 0}
                        onClick={() => onChange(option.productId, qty - 1)}
                      />
                      <span
                        className={`tnum w-6 text-center font-display text-body ${qty ? "text-ink" : "text-ink-faint"}`}
                        aria-live="polite"
                        aria-label={`${option.name}: ${qty}`}
                      >
                        {qty}
                      </span>
                      <Stepper
                        label={`One more ${option.name}`}
                        symbol="+"
                        disabled={qty >= 10}
                        onClick={() => onChange(option.productId, qty + 1)}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
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

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`pressable min-h-11 shrink-0 rounded-control border px-3 text-small ${
        selected ? "border-ink bg-ink text-card" : "border-rule bg-card text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function Stepper({
  label,
  symbol,
  disabled,
  onClick,
}: {
  label: string;
  symbol: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pressable flex h-11 w-11 items-center justify-center rounded-control border border-rule bg-card font-display text-lead disabled:opacity-30"
    >
      {symbol}
    </button>
  );
}
