import Link from "next/link";
import { ConfirmIcon } from "./confirm-icon";
import { describeLines } from "@/app/_components/extras-lines";

/**
 * "Sent to Mohamad" ("Paper, native"): the tick, who it went to, what it
 * comes to, and where it stands. Only reached right after placing, so the
 * order is always at its first step.
 */
export function ConfirmedView({
  wasEdit,
  supplierName,
  toothCount,
  extrasCount,
  total,
}: {
  wasEdit: boolean;
  supplierName: string;
  toothCount: number;
  extrasCount: number;
  total: number;
}) {
  const firstName = supplierName.split(/\s+/)[0] || supplierName;
  const steps = ["Placed", "Confirmed", "Handed over"];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-3.5 px-5 pb-8 pt-[4.375rem] text-center">
      <ConfirmIcon />
      <h1 className="confirm-stagger text-screen-title font-bold text-ink" style={stagger(0)}>
        {wasEdit ? `Changes sent to ${firstName}` : `Sent to ${firstName}`}
      </h1>
      <p className="confirm-stagger tnum text-native-body text-ink-muted" style={stagger(1)}>
        {describeLines(toothCount, extrasCount)} · ${total.toFixed(2)} at pickup
      </p>

      <section
        aria-label="Order status"
        className="confirm-stagger flex w-full flex-col gap-3 rounded-[1.25rem] bg-card p-4 text-left"
        style={stagger(2)}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-list-secondary font-semibold text-ink">Waiting for {firstName}</span>
          <span className="text-list-secondary text-ink-faint">just now</span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {steps.map((step, i) => (
            <span
              key={step}
              className={`h-[0.3125rem] flex-1 rounded-full ${i === 0 ? "bg-ink" : "bg-[rgba(20,18,15,0.12)]"}`}
            />
          ))}
        </div>
        <div className="flex text-[0.75rem] text-ink-faint">
          {steps.map((step, i) => (
            <span key={step} className={`flex-1 ${i === 0 ? "text-ink" : ""} ${i === 1 ? "text-center" : i === 2 ? "text-right" : ""}`}>
              {step}
              {i === 0 && <span className="sr-only"> (done)</span>}
            </span>
          ))}
        </div>
      </section>

      <div className="confirm-stagger mt-auto w-full pt-8" style={stagger(3)}>
        <Link
          href="/student"
          className="flex h-[3.125rem] w-full items-center justify-center rounded-[0.875rem] bg-fill text-native-body font-semibold text-ink transition-transform duration-[120ms] ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:active:scale-100"
        >
          Done
        </Link>
      </div>
    </main>
  );
}


function stagger(index: number): React.CSSProperties {
  return { "--stagger-index": index } as React.CSSProperties;
}
