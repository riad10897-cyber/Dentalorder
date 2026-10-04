"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products/data";
import { PRODUCT_CATEGORIES } from "@/lib/products/categories";
import { createProduct, setProductActive, updateProduct } from "../_actions/products";

const inputClass =
  "min-h-11 w-full rounded-control border border-rule bg-card px-3 py-2 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none";

const DESCRIPTION_MAX = 300;
const BRAND_MAX = 60;

/** Add or edit one product, on its own screen. Back to the list once saved. */
export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [category, setCategory] = useState<string>(product?.category ?? "");
  const [price, setPrice] = useState(product ? product.price.toFixed(2) : "");
  const [unit, setUnit] = useState(product?.unit ?? "");
  const [description, setDescription] = useState(product?.description ?? "");

  function backToList() {
    router.push("/supplier/products");
    router.refresh();
  }

  function save() {
    setError(null);
    setFieldErrors({});
    const input = { name, brand, category, price, unit, description };
    startTransition(async () => {
      const result = product ? await updateProduct(product.id, input) : await createProduct(input);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      backToList();
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
      backToList();
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Field label="Name" hint="What students call it. One size per product, like “Nitrile gloves, M”." error={fieldErrors.name}>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputClass} />
      </Field>

      <Field label="Brand (optional)" hint="Helps students tell two similar products apart." error={fieldErrors.brand}>
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          maxLength={BRAND_MAX}
          placeholder="Dentsply"
          className={inputClass}
        />
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
        <Field label="Pack size (optional)" error={fieldErrors.unit}>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            maxLength={40}
            placeholder="box of 100"
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Description (optional)"
        hint="Size, material, what it's for. Students read this before adding it."
        error={fieldErrors.description}
        counter={
          <span className="tnum">
            {description.length}/{DESCRIPTION_MAX}
          </span>
        }
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX}
          rows={4}
          placeholder="Powder-free, latex-free. Fits most hands in size M."
          className={`${inputClass} resize-none`}
        />
      </Field>

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

      <button
        type="submit"
        disabled={pending}
        className="pressable min-h-11 rounded-control bg-ink px-4 py-3 font-display text-body text-card disabled:opacity-60"
      >
        {pending ? "Saving…" : product ? "Save" : "Add product"}
      </button>

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
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  counter,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  counter?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-small text-ink-muted">
      <span className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {counter && <span className="text-caption text-ink-faint">{counter}</span>}
      </span>
      {children}
      {hint && !error && <span className="text-caption text-ink-faint">{hint}</span>}
      {error && <span className="text-caption text-ink">{error}</span>}
    </label>
  );
}
