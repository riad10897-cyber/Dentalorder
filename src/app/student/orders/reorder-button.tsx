"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorderOrder } from "@/app/student/_actions/orders";

export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await reorderOrder(orderId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/student/order/confirmed/${result.orderId}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="pressable min-h-9 rounded-control border border-rule bg-card px-3 py-1.5 font-display text-caption disabled:opacity-50"
      >
        {pending ? "Ordering…" : "Order again"}
      </button>
      {error && (
        <span className="max-w-[10rem] text-right text-micro text-ink-muted" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
