/**
 * A supplier waiting on approval.
 *
 * Suppliers start in pending_approval and take no orders until someone
 * approves them. Without this they would sign up, land on a dashboard with
 * nothing on it, and reasonably conclude the app was broken. It says what
 * state they are in, what happens next, and what they can usefully do in
 * the meantime.
 */
export function PendingBanner({ displayName }: { displayName: string }) {
  return (
    <section className="mx-5 mt-4 rounded-card border border-ink bg-card-sunk p-4">
      <p className="text-micro uppercase text-ink-faint">Waiting for approval</p>
      <h2 className="mt-1 font-display text-body text-ink">
        {displayName} is not taking orders yet
      </h2>
      <p className="mt-2 text-small text-ink-muted">
        Every new supplier is checked by hand before students can order from them. Until that
        happens you will not appear in the market, and no orders can reach you.
      </p>
      <ol className="mt-3 flex flex-col gap-1.5 text-small text-ink-muted">
        <li>
          <span className="tnum font-display text-ink">1.</span> Set your Frasaco and Copy A prices
          in Products — they are what students compare.
        </li>
        <li>
          <span className="tnum font-display text-ink">2.</span> Contact us (Settings → Help) to say you are ready.
        </li>
        <li>
          <span className="tnum font-display text-ink">3.</span> Once approved, this notice
          disappears and students can find you.
        </li>
      </ol>
    </section>
  );
}
