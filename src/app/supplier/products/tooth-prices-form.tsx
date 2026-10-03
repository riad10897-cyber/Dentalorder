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
  const changed = frasaco !== frasacoPrice.toFixed(2) || copyA !== copyAPrice.toFixed(2);

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
    <div className="overflow-hidden rounded-card border border-rule bg-card">
      <PriceRow label="Frasaco" dotClass="bg-frasaco" value={frasaco} onChange={setFrasaco} disabled={disabled} />
      <PriceRow label="Copy A" dotClass="bg-copy-a" value={copyA} onChange={setCopyA} disabled={disabled} />
      <div className="px-3 pb-3 pt-1">
        {message && (
          <p className="pb-2 text-caption text-ink-muted" aria-live="polite">
            {message}
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || disabled || !changed}
          className="pressable min-h-11 w-full rounded-control bg-ink px-4 py-3 font-display text-body text-card disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save tooth prices"}
        </button>
      </div>
    </div>
  );
}

function PriceRow({
  label,
  dotClass,
  value,
  onChange,
  disabled,
}: {
  label: string;
  dotClass: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex min-h-14 items-center justify-between gap-3 border-b border-hairline px-3 py-2">
      <span className="flex items-center gap-2 font-display text-body text-ink">
        <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-control ${dotClass}`} />
        {label}
        <span className="font-body text-caption text-ink-muted">per tooth</span>
      </span>
      <span className="flex min-h-11 items-center gap-1 rounded-control border border-rule bg-card-sunk px-3">
        <span className="text-ink-muted">$</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} price per tooth, USD`}
          className="tnum w-16 bg-transparent text-right font-display text-body text-ink outline-none"
        />
      </span>
    </label>
  );
}
