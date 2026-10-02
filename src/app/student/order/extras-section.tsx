"use client";

import { PRODUCT_CATEGORIES } from "@/lib/products/categories";
import type { ProductCategorySlug } from "@/lib/products/categories";

export interface ExtraOption {
  productId: string;
  name: string;
  unit: string | null;
  price: number;
  category: ProductCategorySlug;
}

/**
 * "Extras from Riad": the seller's in-stock products, under the chart.
 *
 * Only what this seller sells right now — the list is read fresh when the
 * screen loads, and it is the same list the database will price against.
 * A stepper per product, starting at zero. No section at all when the
 * seller has listed nothing: an empty "Extras" box under every chart would
 * be noise.
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
  if (options.length === 0) return null;

  return (
    <section className="mx-2 mt-3 rounded-card border border-rule bg-card" aria-label={`Extras from ${supplierName}`}>
      <h2 className="border-b border-hairline px-4 py-3 font-display text-body">Extras from {supplierName}</h2>
      {PRODUCT_CATEGORIES.map((category) => {
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
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body text-ink">{option.name}</span>
                      <span className="tnum block truncate text-caption text-ink-muted">
                        ${option.price.toFixed(2)}
                        {option.unit ? ` · ${option.unit}` : ""}
                      </span>
                    </span>
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
    </section>
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
