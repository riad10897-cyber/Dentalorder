/**
 * Placed → Confirmed → Handed over, as three segments with their names.
 *
 * The same bar on the confirmation screen and on every order still in
 * flight, so a student learns it once and reads where an order stands at
 * a glance. Ink only: --fulfilled means handed over, and an order in
 * flight has not been, so the bar never borrows it.
 */
const STEPS = ["Placed", "Confirmed", "Handed over"] as const;

export function OrderProgress({ status }: { status: "pending" | "confirmed" }) {
  const reached = status === "pending" ? 0 : 1;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1" aria-hidden>
        {STEPS.map((step, i) => (
          <span
            key={step}
            className={`state-fade h-[0.3125rem] flex-1 rounded-full ${i <= reached ? "bg-ink" : "bg-[rgba(20,18,15,0.12)]"}`}
          />
        ))}
      </div>
      <ol aria-label="Order progress" className="flex text-[0.75rem] text-ink-faint">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className={`flex-1 ${i <= reached ? "text-ink" : ""} ${i === 1 ? "text-center" : i === 2 ? "text-right" : ""}`}
          >
            {step}
            {i <= reached && <span className="sr-only"> (done)</span>}
            {i === reached + 1 && <span className="sr-only"> (next)</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
