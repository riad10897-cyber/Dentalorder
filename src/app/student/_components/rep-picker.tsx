"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignRep } from "../_actions/rep";
import { RepList } from "@/app/_components/rep-list";
import type { AvailableRep } from "@/lib/student/data";

export function RepPicker({
  reps,
  university,
}: {
  reps: AvailableRep[];
  university: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (reps.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-rule p-4 text-center text-sm text-ink-muted">
        No representative has joined yet. Check back once someone from your group signs up as a
        rep — you&apos;ll be able to pick them here.
      </div>
    );
  }

  function handlePick() {
    if (!selected) {
      setError("Choose a representative first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await assignRep({ repId: selected });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted">
        You don&apos;t have a representative yet. Pick one to start ordering:
      </p>
      <RepList reps={reps} university={university} value={selected} onChange={setSelected} />
      {error && <p className="mt-1.5 text-xs text-ink">{error}</p>}
      <button
        type="button"
        onClick={handlePick}
        disabled={pending}
        className="pressable mt-2.5 min-h-11 w-full rounded-sm bg-ink py-3 font-display text-sm font-bold text-card disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set as my representative"}
      </button>
    </div>
  );
}
