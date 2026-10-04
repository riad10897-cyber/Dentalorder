"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSupplierPrices } from "../_actions/orders";

/**
 * The two tooth prices, at the top of Products: teeth are what a seller
 * sells most, so their prices sit with everything else they sell rather
 * than in Settings.
 */
export function ToothPricesForm({
  frasacoPrice,
  copyAPrice,
  disabled,
}: {
  frasacoPrice: number;
  copyAPrice: number;
  disabled: boolean;
}) {
  const router = useRouter();
  const [frasaco, setFrasaco] = useState(frasacoPrice.toFixed(2));
  const [copyA, setCopyA] = useState(copyAPrice.toFixed(2));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  // By value, so "2.5" against a saved 2.50 is not a change.
  const changed = Number(frasaco) !== frasacoPrice || Number(copyA) !== copyAPrice;

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateSupplierPrices({
        frasacoPrice: Number(frasaco),
        copyAPrice: Number(copyA),
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Saved. Orders already placed keep the price they were placed at.");
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-group bg-card">
        <PriceRow label="Frasaco" dotClass="bg-frasaco" value={frasaco} onChange={setFrasaco} disabled={disabled} />
        <PriceRow label="Copy A" dotClass="bg-copy-a" value={copyA} onChange={setCopyA} disabled={disabled} last />
      </div>
      {message && (
        <p className="mx-1 mt-1.5 text-native-caption text-ink-muted" aria-live="polite">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={pending || disabled || !changed}
        className="pressable mt-2.5 flex h-[3.125rem] w-full items-center justify-center rounded-button bg-ink px-4 text-native-body font-semibold text-card disabled:bg-fill disabled:text-ink-faint"
      >
        {pending ? "Saving…" : "Save tooth prices"}
      </button>
    </>
  );
}

function PriceRow({
  label,
  dotClass,
  value,
  onChange,
  disabled,
  last = false,
}: {
  label: string;
  dotClass: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  last?: boolean;
}) {
  return (
    <label
      className={`ml-4 flex min-h-[3.25rem] items-center justify-between gap-3 py-1.5 pr-3 ${
        last ? "" : "border-b-[0.5px] border-separator"
      }`}
    >
      <span className="flex items-center gap-2 text-native-body text-ink">
        <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass}`} />
        {label}
        <span className="text-list-secondary text-ink-faint">per tooth</span>
      </span>
      <span className="flex h-10 items-center gap-0.5 rounded-field bg-fill px-3 focus-within:outline-2 focus-within:outline-ink">
        <span className="text-native-body text-ink-faint">$</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} price per tooth, USD`}
          className="tnum w-14 bg-transparent text-right text-native-body font-semibold text-ink outline-none"
        />
      </span>
    </label>
  );
}
