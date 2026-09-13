"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignRep } from "../_actions/rep";
import type { AvailableRep } from "@/lib/student/data";

export function RepPicker({ reps, compact }: { reps: AvailableRep[]; compact?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (reps.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border p-4 text-center text-sm text-text-muted">
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
    <div className={compact ? "flex flex-col gap-2.5" : "rounded-card border border-border bg-surface p-4"}>
      {!compact && (
        <p className="mb-3 text-sm text-text-muted">
          You don&apos;t have a representative yet. Pick one to start ordering:
        </p>
      )}
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="min-h-11 w-full rounded-sm border border-border bg-surface2 px-3 py-2 text-text focus:border-accent focus:outline-none"
      >
        <option value="" disabled>
          Choose your rep
        </option>
        {reps.map((rep) => (
          <option key={rep.id} value={rep.id}>
            {rep.displayName}
            {rep.university ? ` — ${rep.university}` : ""}
            {rep.section ? ` (${rep.section})` : ""}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handlePick}
        disabled={pending}
        className="mt-2.5 min-h-11 w-full rounded-sm bg-accent py-3 font-heading text-sm font-bold text-bg disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set as my representative"}
      </button>
    </div>
  );
}
