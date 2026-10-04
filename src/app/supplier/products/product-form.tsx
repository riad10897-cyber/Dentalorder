"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products/data";
import { PRODUCT_CATEGORIES } from "@/lib/products/categories";
import { createProduct, setProductActive, updateProduct } from "../_actions/products";

// "Paper, native": borderless card fields on the paper page.
const inputClass =
  "min-h-11 w-full rounded-field bg-card px-3.5 py-2.5 text-native-body text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-ink";

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

  // The list says what just happened, once: "Added", "Saved" or
  // "Switched off", with the product's name. Only an id travels in the
  // address; the list looks the name up in the seller's own products.
  function backToList(done: "added" | "saved" | "off", productId: string | undefined) {
    router.push(productId ? `/supplier/products?done=${done}&id=${productId}` : "/supplier/products");
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
      backToList(product ? "saved" : "added", product?.id ?? result.productId);
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
      backToList("off", product.id);
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
        <p className="px-1 text-native-caption text-ink-muted">
          A new price applies to orders placed from now on. Orders already placed keep the price
          they were placed at.
        </p>
      )}

      {error && (
        <p className="px-1 text-list-secondary text-ink" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="pressable flex h-[3.125rem] items-center justify-center rounded-button bg-ink px-4 text-native-body font-semibold text-card disabled:opacity-60"
      >
        {pending ? "Saving…" : product ? "Save" : "Add product"}
      </button>

      {product && (
        <button
          type="button"
          onClick={switchOff}
          disabled={pending}
          className="pressable -mt-1 flex h-[3.125rem] items-center justify-center rounded-button bg-fill px-4 text-native-body font-semibold text-ink-muted disabled:opacity-60"
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
    <label className="flex flex-col gap-1.5 text-native-caption text-ink-muted">
      <span className="flex items-baseline justify-between gap-2 px-1">
        <span>{label}</span>
        {counter && <span className="text-ink-faint">{counter}</span>}
      </span>
      {children}
      {hint && !error && <span className="px-1 text-ink-faint">{hint}</span>}
      {error && <span className="px-1 text-ink">{error}</span>}
    </label>
  );
}
