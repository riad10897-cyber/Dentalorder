"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorderOrder } from "@/app/student/_actions/orders";

/**
 * Places the same teeth again, for next week, at today's prices.
 *
 * The card this sits on shows the old order's total, so that is the total
 * the student is agreeing to when they tap. If the supplier's prices have
 * moved since, nothing is placed: the button says what changed and asks
 * for a second tap at the new figure.
 */
export function ReorderButton({ orderId, shownTotal }: { orderId: string; shownTotal: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Once they have been told the new total, that is what they are agreeing to.
  const [newTotal, setNewTotal] = useState<number | null>(null);

  function handleClick() {
    setError(null);
    const expected = newTotal ?? shownTotal;
    startTransition(async () => {
      const result = await reorderOrder(orderId, expected);
      if (result.kind === "pricesChanged") {
        setNewTotal(result.newTotal);
        return;
      }
      if (result.kind === "error") {
        setError(result.message);
        return;
      }
      router.push(`/student/order/confirmed/${result.orderId}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {newTotal !== null && (
        <p className="tnum max-w-[13rem] text-right text-caption text-ink" role="status">
          Prices changed since this order. Was ${shownTotal.toFixed(2)}, now ${newTotal.toFixed(2)}.
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="pressable min-h-11 rounded-control border border-rule bg-card px-3 py-1.5 font-display text-caption disabled:opacity-50"
      >
        {pending ? "Ordering…" : newTotal !== null ? `Order again at $${newTotal.toFixed(2)}` : "Order again"}
      </button>
      {error && (
        <span className="max-w-[10rem] text-right text-micro text-ink-muted" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
