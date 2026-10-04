"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products/data";
import { PRODUCT_CATEGORIES, categoryName } from "@/lib/products/categories";
import { setProductActive, setProductInStock } from "../_actions/products";

export function ProductsClient({ products, canAdd }: { products: Product[]; canAdd: boolean }) {
  const selling = products.filter((p) => p.isActive);
  const switchedOff = products.filter((p) => !p.isActive);

  return (
    <div className="mt-3 flex flex-col gap-4 px-5">
      {canAdd && (
        <Link
          href="/supplier/products/new"
          className="pressable flex min-h-11 items-center justify-center rounded-control bg-ink px-4 py-3 font-display text-body text-card"
        >
          Add a product
        </Link>
      )}

      {products.length === 0 && (
        <p className="rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
          No products yet. Start with whatever your class asks you for besides teeth — gloves,
          burs, a box of masks.
        </p>
      )}

      {PRODUCT_CATEGORIES.map((category) => {
        const inCategory = selling.filter((p) => p.category === category.slug);
        if (inCategory.length === 0) return null;
        return (
          <section key={category.slug}>
            <h3 className="px-0.5 pb-1.5 text-micro uppercase text-ink-faint">{category.name}</h3>
            <ul className="overflow-hidden rounded-card border border-rule bg-card">
              {inCategory.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </ul>
          </section>
        );
      })}

      {switchedOff.length > 0 && (
        <section>
          <h3 className="px-0.5 pb-1.5 text-micro uppercase text-ink-faint">Switched off</h3>
          <p className="px-0.5 pb-2 text-caption text-ink-muted">
            Students don&rsquo;t see these. Past orders keep them as they were.
          </p>
          <ul className="overflow-hidden rounded-card border border-rule bg-card-sunk">
            {switchedOff.map((product) => (
              <SwitchedOffRow key={product.id} product={product} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** "Dentsply · $6.50 · box of 100", as much of it as the seller filled in. */
function summary(product: Product): string {
  return [product.brand, `$${product.price.toFixed(2)}`, product.unit].filter(Boolean).join(" · ");
}

function ProductRow({ product }: { product: Product }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Shown immediately; put back if the save fails.
  const [inStock, setInStock] = useState(product.inStock);

  function toggleStock() {
    const next = !inStock;
    setInStock(next);
    setError(null);
    startTransition(async () => {
      const result = await setProductInStock(product.id, next);
      if (!result.ok) {
        setInStock(!next);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-3 border-b border-hairline px-3 py-2.5 last:border-none">
      <Link
        href={`/supplier/products/${product.id}`}
        aria-label={`Edit ${product.name}`}
        className="pressable min-h-11 min-w-0 flex-1 text-left"
      >
        <span className="block truncate font-display text-body text-ink">{product.name}</span>
        <span className="tnum block truncate text-caption text-ink-muted">{summary(product)}</span>
        {error && (
          <span className="block text-caption text-ink" role="alert">
            {error}
          </span>
        )}
      </Link>
      <button
        type="button"
        role="switch"
        aria-checked={inStock}
        aria-label={`${product.name} in stock`}
        onClick={toggleStock}
        disabled={pending}
        className="pressable flex min-h-11 shrink-0 items-center gap-2 rounded-control px-1"
      >
        <span className={`text-caption ${inStock ? "text-ink" : "text-ink-muted"}`}>
          {inStock ? "In stock" : "Out of stock"}
        </span>
        <span
          aria-hidden
          className={`relative inline-block h-6 w-10 rounded-full border transition-colors duration-150 ${
            inStock ? "border-ink bg-ink" : "border-rule bg-card-sunk"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-card transition-transform duration-150 ${
              inStock ? "translate-x-[1.125rem]" : "translate-x-0.5"
            }`}
            style={{ height: "1.125rem", width: "1.125rem" }}
          />
        </span>
      </button>
    </li>
  );
}

function SwitchedOffRow({ product }: { product: Product }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function switchOn() {
    setError(null);
    startTransition(async () => {
      const result = await setProductActive(product.id, true);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-3 border-b border-hairline px-3 py-2.5 last:border-none">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-body text-ink-muted">{product.name}</span>
        <span className="tnum block truncate text-caption text-ink-faint">
          {categoryName(product.category)} · {summary(product)}
        </span>
        {error && (
          <span className="block text-caption text-ink" role="alert">
            {error}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={switchOn}
        disabled={pending}
        className="pressable min-h-11 shrink-0 rounded-control border border-rule bg-card px-3 font-display text-small text-ink"
      >
        {pending ? "…" : "Switch on"}
      </button>
    </li>
  );
}
