"use client";

import { useEffect, useState } from "react";
import { Molo } from "@/app/_components/molo";
import { describeLines } from "@/app/_components/extras-lines";

const SEEN_KEY = "molaro:handed-seen";

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>) {
  try {
    // Only the newest few are worth keeping.
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-50)));
  } catch {
    // Private mode: it shows again next visit, which is harmless.
  }
}

/**
 * The end of the journey: the teeth are in the student's hands. The first
 * time they open Orders after a hand-over, Molo cheers once (three jumps,
 * then rests) above the list. "Done" puts it away for good on this phone;
 * every hand-over showing at once is put away together, so it never
 * becomes a queue of celebrations.
 *
 * Remembered per phone, not in the database: it is a moment, not a record.
 * Renders nothing until the browser says it hasn't been seen, so it never
 * flashes for a student who already dismissed it.
 */
export function HandedOverMoment({
  orders,
}: {
  orders: { id: string; supplierName: string; teeth: number; extras: number }[];
}) {
  const [show, setShow] = useState<(typeof orders)[number] | null>(null);

  useEffect(() => {
    const seen = readSeen();
    setShow(orders.find((o) => !seen.has(o.id)) ?? null);
  }, [orders]);

  if (!show) return null;

  const firstName = show.supplierName.split(/\s+/)[0] || show.supplierName;

  function done() {
    const seen = readSeen();
    for (const o of orders) seen.add(o.id);
    writeSeen(seen);
    setShow(null);
  }

  return (
    <section aria-label="Handed over" className="note-in mt-2 flex flex-col items-center gap-2 rounded-group bg-card px-4 pb-4 pt-5 text-center">
      <Molo mood="handed" size={140} loop={false} />
      <h2 className="mt-1 text-sheet-title font-bold text-ink">You have your teeth</h2>
      <p className="tnum text-list-secondary text-ink-muted">
        {firstName} handed over your order · {describeLines(show.teeth, show.extras)}
      </p>
      <button
        type="button"
        onClick={done}
        className="pressable mt-2 flex h-11 w-full items-center justify-center rounded-button bg-fill text-native-body font-semibold text-ink"
      >
        Done
      </button>
    </section>
  );
}
