import Link from "next/link";
import type { DirectorySupplier } from "@/lib/supplier/directory";
import { groupSuppliersByUniversity } from "@/lib/supplier/group";
import { TypePrices } from "@/app/_components/type-prices";

const HEADING = "px-0.5 pb-1.5 pt-1 text-micro uppercase text-ink-faint";

/**
 * The market, as links rather than a picker.
 *
 * Every supplier is here, their kind is on the row, and both prices are
 * readable before anything is tapped — the prices are most of what is
 * being chosen between, so hiding them behind a tap would make the choice
 * a guess. Tapping opens the chart at that supplier's prices.
 */
export function MarketList({
  suppliers,
  university,
  extrasCounts,
}: {
  suppliers: DirectorySupplier[];
  university: string | null;
  /** Extras on sale per seller id. A seller with none is simply absent. */
  extrasCounts: Record<string, number>;
}) {
  const { mine, others, grouped } = groupSuppliersByUniversity(suppliers, university);

  const row = (supplier: DirectorySupplier, showUniversity: boolean) => (
    <MarketRow
      key={supplier.id}
      supplier={supplier}
      showUniversity={showUniversity}
      extras={extrasCounts[supplier.id] ?? 0}
    />
  );

  return (
    <div className="flex flex-col rounded-card border border-rule bg-card p-2">
      {grouped ? (
        <>
          <p className={HEADING}>{university}</p>
          {mine.length > 0 ? (
            mine.map((s) => row(s, false))
          ) : (
            <p className="px-2.5 py-2 text-caption text-ink-muted">
              Nobody from {university} is supplying yet. Order from another faculty below — the
              teeth are the same.
            </p>
          )}

          {others.length > 0 && (
            <>
              <p className={`${HEADING} mt-2 border-t border-hairline pt-3`}>Other faculties</p>
              {others.map((s) => row(s, true))}
            </>
          )}
        </>
      ) : (
        others.map((s) => row(s, true))
      )}
    </div>
  );
}

function MarketRow({
  supplier,
  showUniversity,
  extras,
}: {
  supplier: DirectorySupplier;
  showUniversity: boolean;
  extras: number;
}) {
  const meta = [
    supplier.kind === "shop" ? "Shop" : "Student supplier",
    showUniversity ? supplier.university : null,
    extras > 0 ? `+ ${extras} ${extras === 1 ? "extra" : "extras"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/student/order?supplier=${supplier.id}`}
      className="pressable flex min-h-11 items-center gap-3 rounded-control px-2.5 py-2.5 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-body text-ink">
          {supplier.displayName}
        </span>
        <span className="mt-0.5 block">
          <TypePrices frasacoPrice={supplier.frasacoPrice} copyAPrice={supplier.copyAPrice} />
        </span>
        {meta && <span className="mt-0.5 block truncate text-caption text-ink-muted">{meta}</span>}
      </span>
      <svg
        className="ml-1 shrink-0 text-ink-faint"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}
