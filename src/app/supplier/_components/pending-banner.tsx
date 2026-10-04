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
    <section className="mt-4 rounded-group bg-card px-4 py-3.5">
      <p className="text-native-caption font-semibold text-ink-faint">Waiting for approval</p>
      <h2 className="mt-0.5 text-native-body font-semibold text-ink">
        {displayName} is not taking orders yet
      </h2>
      <p className="mt-1 text-list-secondary text-ink-muted">
        Every new seller is checked by hand before students can order from them. Until then you are
        not in the market, and no orders can reach you.
      </p>
      <ol className="mt-3 flex flex-col gap-2 border-t-[0.5px] border-separator pt-3 text-list-secondary text-ink-muted">
        {[
          <>Set your Frasaco and Copy A prices in Products. They are what students compare.</>,
          <>Contact us (Settings → Contact us) to say you are ready.</>,
          <>Once approved, this notice goes and students can find you.</>,
        ].map((step, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="tnum flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[0.6875rem] font-semibold text-card">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
