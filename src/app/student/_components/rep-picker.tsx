"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignRep } from "../_actions/rep";
import { RepList } from "@/app/_components/rep-list";
import type { AvailableRep } from "@/lib/student/data";

export function RepPicker({
  reps,
  university,
  currentRepId,
  onCancel,
}: {
  reps: AvailableRep[];
  university: string | null;
  /** Set when the student already has a rep. Switching is confirmed; a
   *  first-time pick is not, because there is nothing to undo. */
  currentRepId?: string;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const switching = Boolean(currentRepId);
  const choices = reps.filter((rep) => rep.id !== currentRepId);
  const chosen = choices.find((rep) => rep.id === selected) ?? null;

  if (choices.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-rule p-4 text-center text-sm text-ink-muted">
        {switching
          ? "There is no other representative to switch to yet."
          : "No representative has joined yet. Check back once someone from your group signs up as a rep — you'll be able to pick them here."}
      </div>
    );
  }

  function submit() {
    if (!chosen) {
      setError("Choose a representative first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await assignRep({ repId: chosen.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(false);
      onCancel?.();
      router.refresh();
    });
  }

  return (
    <div>
      {!switching && (
        <p className="mb-3 text-sm text-ink-muted">
          You don&apos;t have a representative yet. Pick one to start ordering:
        </p>
      )}

      <RepList
        reps={choices}
        university={university}
        value={selected}
        onChange={(id) => {
          setSelected(id);
          setConfirming(false);
          setError(null);
        }}
      />

      {error && (
        <p className="mt-1.5 text-xs text-ink" role="alert">
          {error}
        </p>
      )}

      {confirming && chosen ? (
        // The prices are the point of the confirmation: the rep is a name,
        // but what changes for the student is what next week costs.
        <div className="mt-2.5 rounded-card border border-rule bg-card-sunk p-3.5">
          <p className="font-display text-body text-ink">
            Switch to {chosen.displayName}?
          </p>
          <p className="tnum mt-1 text-caption text-ink-muted">
            Frasaco ${chosen.frasacoPrice.toFixed(2)} · Copy A $
            {chosen.copyAPrice.toFixed(2)}
          </p>
          <p className="mt-2 text-caption text-ink-muted">
            Orders you have already placed keep their original rep and prices.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="pressable min-h-11 flex-1 rounded-control border border-rule py-2.5 font-display text-small text-ink-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="pressable min-h-11 flex-[2] rounded-control bg-ink py-2.5 font-display text-small text-card disabled:opacity-60"
            >
              {pending ? "Switching…" : `Switch to ${chosen.displayName}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex gap-2">
          {switching && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="pressable min-h-11 flex-1 rounded-control border border-rule py-3 font-display text-small text-ink-muted"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!chosen) {
                setError("Choose a representative first.");
                return;
              }
              setError(null);
              if (switching) setConfirming(true);
              else submit();
            }}
            disabled={pending}
            className="pressable min-h-11 flex-[2] rounded-sm bg-ink py-3 font-display text-sm font-bold text-card disabled:opacity-60"
          >
            {switching ? "Continue" : pending ? "Saving…" : "Set as my representative"}
          </button>
        </div>
      )}
    </div>
  );
}
