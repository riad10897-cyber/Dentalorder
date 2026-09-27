"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelOrder } from "@/app/student/_actions/orders";

/**
 * Cancel a pending order, after one explicit confirmation.
 *
 * Two steps because it cannot be undone: once cancelled the order is
 * frozen, and the only way back is placing it again. The confirm step says
 * so, plainly, rather than asking "Are you sure?".
 */
export function CancelOrderButton({
  orderId,
  label = "Cancel",
  onCancelled,
  className,
}: {
  orderId: string;
  label?: string;
  /** Where to go afterwards. Defaults to refreshing the current page. */
  onCancelled?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelOrder(orderId);
      if (!result.ok) {
        setError(result.message);
        setConfirming(false);
        return;
      }
      if (onCancelled) onCancelled();
      else router.refresh();
    });
  }

  if (!confirming) {
    return (
      <span className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={
            className ??
            "pressable flex min-h-11 items-center rounded-control px-3 font-display text-small text-ink-muted underline underline-offset-2"
          }
        >
          {label}
        </button>
        {error && (
          <span className="max-w-[12rem] text-right text-micro text-ink" role="alert">
            {error}
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-control border border-ink bg-card-sunk p-3"
      role="group"
      aria-label="Confirm cancelling this order"
    >
      <p className="text-small text-ink">
        Cancel this order? Your supplier will see it as cancelled. This can&rsquo;t be undone.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="pressable min-h-11 flex-1 rounded-control border border-rule bg-card font-display text-small text-ink"
        >
          Keep it
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="pressable min-h-11 flex-1 rounded-control bg-ink font-display text-small text-card disabled:opacity-60"
        >
          {pending ? "Cancelling…" : "Yes, cancel it"}
        </button>
      </div>
    </div>
  );
}
