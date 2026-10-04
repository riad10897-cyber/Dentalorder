"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products/data";
import { PRODUCT_CATEGORIES, categoryName } from "@/lib/products/categories";
import { setProductActive, setProductInStock } from "../_actions/products";
import { EmptyState, BoxIcon } from "@/app/_components/icons";
import { SectionHeader } from "@/app/_components/section-header";

export function ProductsClient({ products, canAdd }: { products: Product[]; canAdd: boolean }) {
  const selling = products.filter((p) => p.isActive);
  const switchedOff = products.filter((p) => !p.isActive);

  return (
    <div className="mt-3">
      {canAdd && (
        <Link
          href="/supplier/products/new"
          className="pressable flex h-[3.125rem] items-center justify-center gap-1.5 rounded-button bg-ink px-4 text-native-body font-semibold text-card"
        >
          <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add a product
        </Link>
      )}

      {products.length === 0 && (
        <EmptyState native icon={<BoxIcon />} className="mt-3">
          No products yet. Start with whatever your class asks you for besides teeth — gloves,
          burs, a box of masks.
        </EmptyState>
      )}

      {PRODUCT_CATEGORIES.map((category) => {
        const inCategory = selling.filter((p) => p.category === category.slug);
        if (inCategory.length === 0) return null;
        return (
          <section key={category.slug}>
            <SectionHeader>{category.name}</SectionHeader>
            <ul className="overflow-hidden rounded-group bg-card">
              {inCategory.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </ul>
          </section>
        );
      })}

      {switchedOff.length > 0 && (
        <section>
          <SectionHeader>Switched off</SectionHeader>
          <ul className="overflow-hidden rounded-group bg-card">
            {switchedOff.map((product) => (
              <SwitchedOffRow key={product.id} product={product} />
            ))}
          </ul>
          <p className="mx-4 mt-1.5 text-native-caption text-ink-faint">
            Students don&rsquo;t see these. Past orders keep them as they were.
          </p>
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
    <li className="ml-4 flex items-center gap-3 border-b-[0.5px] border-separator py-2 pr-3 last:border-none">
      <Link
        href={`/supplier/products/${product.id}`}
        aria-label={`Edit ${product.name}`}
        className="pressable flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
      >
        <span className="block truncate text-native-body text-ink">{product.name}</span>
        <span className="tnum block truncate text-list-secondary text-ink-faint">
          {!inStock && <span className="text-ink-muted">Out of stock · </span>}
          {summary(product)}
        </span>
        {error && (
          <span className="block text-native-caption text-ink" role="alert">
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
        className="pressable flex min-h-11 shrink-0 items-center"
      >
        {/* An iOS switch, in ink: green would read as "fulfilled". */}
        <span
          aria-hidden
          className={`ios-switch relative inline-block h-[1.9375rem] w-[3.1875rem] rounded-full ${
            inStock ? "bg-ink" : "bg-rule"
          }`}
        >
          <span
            className={`ios-switch-knob absolute left-0.5 top-0.5 h-[1.6875rem] w-[1.6875rem] rounded-full bg-white ${
              inStock ? "translate-x-[1.25rem]" : "translate-x-0"
            }`}
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
    <li className="ml-4 flex items-center gap-3 border-b-[0.5px] border-separator py-2 pr-3 last:border-none">
      <span className="min-w-0 flex-1 py-0.5">
        <span className="block truncate text-native-body text-ink-muted">{product.name}</span>
        <span className="tnum block truncate text-list-secondary text-ink-faint">
          {categoryName(product.category)} · {summary(product)}
        </span>
        {error && (
          <span className="block text-native-caption text-ink" role="alert">
            {error}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={switchOn}
        disabled={pending}
        className="pressable relative flex h-8 shrink-0 items-center rounded-full bg-fill px-3.5 text-list-secondary font-semibold text-ink after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-['']"
      >
        {pending ? "…" : "Switch on"}
      </button>
    </li>
  );
}
