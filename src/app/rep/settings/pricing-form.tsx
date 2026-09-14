"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRepPrices } from "../_actions/orders";

export function PricingForm({
  frasacoPrice,
  copyAPrice,
}: {
  frasacoPrice: number;
  copyAPrice: number;
}) {
  const router = useRouter();
  const [frasaco, setFrasaco] = useState(frasacoPrice.toFixed(2));
  const [copyA, setCopyA] = useState(copyAPrice.toFixed(2));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateRepPrices({
        frasacoPrice: Number(frasaco),
        copyAPrice: Number(copyA),
      });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setMessage("Saved. This only affects orders placed from now on.");
      router.refresh();
    });
  }

  return (
    <div className="mx-6 rounded-card border border-rule bg-card p-4">
      <div className="mb-4 font-display text-[15px] font-bold">Your Tooth Prices</div>

      <PriceRow label="Frasaco (per tooth)" dotClass="bg-ink" value={frasaco} onChange={setFrasaco} />
      <PriceRow label="Copy A (per tooth)" dotClass="bg-copy-a" value={copyA} onChange={setCopyA} />

      {message && <p className="mt-3 text-xs text-ink-muted">{message}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="mt-4 min-h-11 w-full rounded-lg bg-ink py-3.5 font-display text-[15px] font-bold text-card disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save Prices"}
      </button>
    </div>
  );
}

function PriceRow({
  label,
  dotClass,
  value,
  onChange,
}: {
  label: string;
  dotClass: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-rule py-2.5 last:border-none">
      <div className="flex items-center gap-2 text-sm">
        <span className={`inline-block h-2.5 w-2.5 rounded-[3px] ${dotClass}`} />
        {label}
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-rule bg-card-sunk px-3 py-1.5">
        <span className="text-ink-muted">$</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 bg-transparent text-right font-display text-base font-bold outline-none"
        />
      </div>
    </div>
  );
}
