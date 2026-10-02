"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products/data";
import { PRODUCT_CATEGORIES, categoryName } from "@/lib/products/categories";
import {
  createProduct,
  setProductActive,
  setProductInStock,
  updateProduct,
} from "../_actions/products";

const inputClass =
  "min-h-11 w-full rounded-control border border-rule bg-card px-3 py-2 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none";

export function ProductsClient({ products, canAdd }: { products: Product[]; canAdd: boolean }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const selling = products.filter((p) => p.isActive);
  const switchedOff = products.filter((p) => !p.isActive);

  return (
    <div className="mt-5 flex flex-col gap-4 px-5">
      {adding ? (
        <ProductForm onDone={() => setAdding(false)} />
      ) : (
        canAdd && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="pressable min-h-11 rounded-control bg-ink px-4 py-3 font-display text-body text-card"
          >
            Add a product
          </button>
        )
      )}

      {products.length === 0 && !adding && (
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
            <h2 className="px-0.5 pb-1.5 text-micro uppercase text-ink-faint">{category.name}</h2>
            <ul className="overflow-hidden rounded-card border border-rule bg-card">
              {inCategory.map((product) =>
                editingId === product.id ? (
                  <li key={product.id} className="border-b border-hairline p-3 last:border-none">
                    <ProductForm product={product} onDone={() => setEditingId(null)} />
                  </li>
                ) : (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onEdit={() => {
                      setEditingId(product.id);
                      setAdding(false);
                    }}
                  />
                ),
              )}
            </ul>
          </section>
        );
      })}

      {switchedOff.length > 0 && (
        <section>
          <h2 className="px-0.5 pb-1.5 text-micro uppercase text-ink-faint">Switched off</h2>
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

function ProductRow({ product, onEdit }: { product: Product; onEdit: () => void }) {
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
      <button type="button" onClick={onEdit} className="pressable min-h-11 min-w-0 flex-1 text-left">
        <span className="block truncate font-display text-body text-ink">{product.name}</span>
        <span className="tnum block truncate text-caption text-ink-muted">
          ${product.price.toFixed(2)}
          {product.unit ? ` · ${product.unit}` : ""}
        </span>
        {error && (
          <span className="block text-caption text-ink" role="alert">
            {error}
          </span>
        )}
      </button>
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
          {categoryName(product.category)} · ${product.price.toFixed(2)}
          {product.unit ? ` · ${product.unit}` : ""}
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

function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState<string>(product?.category ?? "");
  const [price, setPrice] = useState(product ? product.price.toFixed(2) : "");
  const [unit, setUnit] = useState(product?.unit ?? "");

  function save() {
    setError(null);
    setFieldErrors({});
    const input = { name, category, price, unit };
    startTransition(async () => {
      const result = product ? await updateProduct(product.id, input) : await createProduct(input);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.refresh();
      onDone();
    });
  }

  function switchOff() {
    if (!product) return;
    setError(null);
    startTransition(async () => {
      const result = await setProductActive(product.id, false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-ink bg-card p-3">
      <p className="font-display text-body">{product ? "Edit product" : "New product"}</p>

      <Field label="Name" error={fieldErrors.name}>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputClass} />
      </Field>

      <Field label="Category" error={fieldErrors.category}>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          <option value="" disabled>
            Choose a category
          </option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (USD)" error={fieldErrors.price}>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="6.50"
            className={`${inputClass} tnum`}
          />
        </Field>
        <Field label="Unit (optional)" error={fieldErrors.unit}>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            maxLength={40}
            placeholder="box of 100"
            className={inputClass}
          />
        </Field>
      </div>

      {product && (
        <p className="text-caption text-ink-muted">
          A new price applies to orders placed from now on. Orders already placed keep the price
          they were placed at.
        </p>
      )}

      {error && (
        <p className="text-small text-ink" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDone}
          disabled={pending}
          className="pressable min-h-11 flex-1 rounded-control border border-rule bg-card font-display text-small text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="pressable min-h-11 flex-[2] rounded-control bg-ink font-display text-small text-card disabled:opacity-60"
        >
          {pending ? "Saving…" : product ? "Save" : "Add product"}
        </button>
      </div>

      {product && (
        <button
          type="button"
          onClick={switchOff}
          disabled={pending}
          className="pressable min-h-11 rounded-control text-small text-ink-muted underline underline-offset-2"
        >
          Switch off — stop selling this
        </button>
      )}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-small text-ink-muted">
      {label}
      {children}
      {error && <span className="text-caption text-ink">{error}</span>}
    </label>
  );
}
