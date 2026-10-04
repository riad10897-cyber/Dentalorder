/**
 * "Frasaco $2.50 · Copy A $1.20", each with its type colour. Names spelled
 * out: a bare "F" and "C" had to be decoded.
 */
export function TypePrices({ frasacoPrice, copyAPrice }: { frasacoPrice: number; copyAPrice: number }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 text-caption text-ink-muted">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px] bg-frasaco" />
        Frasaco <span className="tnum font-display text-ink">${frasacoPrice.toFixed(2)}</span>
      </span>
      <span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[2px] bg-copy-a" />
        Copy A <span className="tnum font-display text-ink">${copyAPrice.toFixed(2)}</span>
      </span>
    </span>
  );
}
