"use client";

import type { DirectorySupplier } from "@/lib/supplier/directory";
import { groupSuppliersByUniversity } from "@/lib/supplier/group";

const HEADING = "px-0.5 pb-1.5 pt-1 text-micro uppercase text-ink-faint";

export function SupplierList({
  suppliers,
  university,
  value,
  onChange,
}: {
  suppliers: DirectorySupplier[];
  university: string | null;
  value: string;
  onChange: (supplierId: string) => void;
}) {
  const { mine, others, grouped } = groupSuppliersByUniversity(suppliers, university);

  const row = (supplier: DirectorySupplier) => (
    <SupplierRow
      key={supplier.id}
      supplier={supplier}
      showUniversity={!grouped || !mine.includes(supplier)}
      selected={value === supplier.id}
      onSelect={onChange}
    />
  );

  return (
    <div
      role="radiogroup"
      aria-label="Supplier"
      className="flex flex-col rounded-card border border-rule bg-card p-2"
    >
      {grouped ? (
        <>
          <p className={HEADING}>{university}</p>
          {mine.length > 0 ? (
            mine.map(row)
          ) : (
            <p className="px-2.5 py-2 text-caption text-ink-muted">
              Nobody from {university} is supplying yet. Order from another faculty below — the
              teeth are the same.
            </p>
          )}

          {others.length > 0 && (
            <>
              <p className={`${HEADING} mt-2 border-t border-hairline pt-3`}>Other faculties</p>
              {others.map(row)}
            </>
          )}
        </>
      ) : (
        others.map(row)
      )}
    </div>
  );
}

function SupplierRow({
  supplier,
  showUniversity,
  selected,
  onSelect,
}: {
  supplier: DirectorySupplier;
  showUniversity: boolean;
  selected: boolean;
  onSelect: (supplierId: string) => void;
}) {
  const meta = [
    supplier.kind === "shop" ? "Shop" : "Student supplier",
    showUniversity ? supplier.university : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(supplier.id)}
      className={`pressable flex min-h-11 items-center gap-3 rounded-control px-2.5 py-2 text-left ${
        selected ? "bg-card-sunk" : ""
      }`}
    >
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-ink bg-ink" : "border-rule"
        }`}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-card" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-body text-ink">
          {supplier.displayName}
        </span>
        {meta && <span className="block truncate text-caption text-ink-muted">{meta}</span>}
      </span>
      {/* Both prices before you tap, because that is what you are choosing. */}
      <span className="tnum shrink-0 text-right text-caption text-ink-muted">
        <span className="block">F ${supplier.frasacoPrice.toFixed(2)}</span>
        <span className="block">C ${supplier.copyAPrice.toFixed(2)}</span>
      </span>
    </button>
  );
}
