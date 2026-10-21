import Link from "next/link";
import { Molo } from "@/app/_components/molo";
import { describeLines } from "@/app/_components/extras-lines";
import { OrderProgress } from "@/app/_components/order-progress";
import { ordinal, type StreakNote } from "@/lib/orders/streak";

/**
 * "Sent to Mohamad" ("Paper, native"): Molo, who it went to, what it
 * comes to, and where it stands. Only reached right after placing, so the
 * order is always at its first step.
 */
export function ConfirmedView({
  wasEdit,
  supplierName,
  toothCount,
  extrasCount,
  total,
  streak,
}: {
  streak: StreakNote;
  wasEdit: boolean;
  supplierName: string;
  toothCount: number;
  extrasCount: number;
  total: number;
}) {
  const firstName = supplierName.split(/\s+/)[0] || supplierName;
  // A first order and every milestone get the cheer; a plain week in a
  // row keeps the hop. Either way the words say it too.
  const cheer = streak.kind === "first" || (streak.kind === "streak" && streak.milestone);
  const streakLine =
    streak.kind === "first"
      ? "Your first order on Molaro."
      : streak.kind === "streak"
        ? streak.milestone
          ? `Your ${ordinal(streak.weeks)} week in a row.`
          : `${streak.weeks} weeks in a row. Nice.`
        : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-3.5 px-5 pb-8 pt-[4.375rem] text-center">
      {/* Molo's hop, three times, then he rests: the order went through. */}
      <Molo mood={cheer ? "handed" : "gotit"} size={120} loop={false} />
      <h1 className="confirm-stagger text-screen-title font-bold text-ink" style={stagger(0)}>
        {wasEdit ? `Changes sent to ${firstName}` : `Sent to ${firstName}`}
      </h1>
      <p className="confirm-stagger tnum text-native-body text-ink-muted" style={stagger(1)}>
        {describeLines(toothCount, extrasCount)} · ${total.toFixed(2)} at pickup
      </p>
      {streakLine && (
        <p className="confirm-stagger tnum -mt-1 rounded-full bg-card px-3.5 py-1.5 text-list-secondary font-semibold text-ink" style={stagger(1)}>
          {streakLine}
        </p>
      )}

      <section
        aria-label="Order status"
        className="confirm-stagger flex w-full flex-col gap-3 rounded-[1.25rem] bg-card p-4 text-left"
        style={stagger(2)}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-list-secondary font-semibold text-ink">Waiting for {firstName}</span>
          <span className="text-list-secondary text-ink-faint">just now</span>
        </div>
        <OrderProgress status="pending" />
      </section>

      {/* What happens next, and the way back: a student who spots a
          mistake right after placing should know it is not too late. */}
      <p className="confirm-stagger text-list-secondary text-ink-muted" style={stagger(3)}>
        Until {firstName} confirms, you can still edit or cancel it in{" "}
        <Link href="/student/orders" className="text-ink underline underline-offset-2">
          Orders
        </Link>
        .
      </p>

      <div className="confirm-stagger mt-auto w-full pt-8" style={stagger(4)}>
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
