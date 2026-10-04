"use client";

import { useState } from "react";
import Link from "next/link";
import type { DirectorySupplier } from "@/lib/supplier/directory";
import { groupSuppliersByUniversity } from "@/lib/supplier/group";

/**
 * The market, "Paper, native": a search field, then the sellers as an
 * inset grouped list. Each row is a link straight to that seller's chart.
 *
 * Both prices are on the row before anything is tapped: the prices are
 * most of what is being chosen between. Each sits in a pill with its tooth
 * type's colour; the pill's accessible name says which type it is, and the
 * order screen's switch names both.
 */
export function MarketList({
  suppliers,
  university,
  extrasCounts,
  between,
}: {
  suppliers: DirectorySupplier[];
  university: string | null;
  /** Extras on sale per seller id. A seller with none is simply absent. */
  extrasCounts: Record<string, number>;
  /** Shown between the search field and the list (the Reorder card). */
  between?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matching = q ? suppliers.filter((s) => s.displayName.toLowerCase().includes(q)) : suppliers;
  const { mine, others, grouped } = groupSuppliersByUniversity(matching, university);

  const sections: { title: string; rows: DirectorySupplier[]; showUniversity: boolean }[] = grouped
    ? [
        { title: university ?? "Sellers", rows: mine, showUniversity: false },
        { title: "Other faculties", rows: others, showUniversity: true },
      ]
    : [{ title: "Sellers", rows: others, showUniversity: true }];

  return (
    <>
      <label className="flex h-[2.375rem] items-center gap-2 rounded-field bg-fill px-2.5 text-ink-faint">
        <svg aria-hidden width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sellers"
          aria-label="Search sellers"
          className="min-w-0 flex-1 bg-transparent text-native-body text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </label>

      {between}

      {matching.length === 0 ? (
        <>
          <SectionHeader>Sellers</SectionHeader>
          <div className="rounded-group bg-card">
            <p className="p-[1.125rem] text-center text-list-secondary text-ink-faint">
              No seller called “{query.trim()}”.
            </p>
          </div>
        </>
      ) : (
        sections.map((section) =>
          section.rows.length === 0 && (q || !grouped || section.showUniversity) ? null : (
            <section key={section.title}>
              <SectionHeader>{section.title}</SectionHeader>
              {section.rows.length === 0 ? (
                <div className="rounded-group bg-card">
                  <p className="px-4 py-3 text-list-secondary text-ink-muted">
                    Nobody from {university} is selling yet. Order from another faculty below — the
                    teeth are the same.
                  </p>
                </div>
              ) : (
                <ul className="overflow-hidden rounded-group bg-card">
                  {section.rows.map((supplier, i) => (
                    <MarketRow
                      key={supplier.id}
                      supplier={supplier}
                      showUniversity={section.showUniversity}
                      extras={extrasCounts[supplier.id] ?? 0}
                      last={i === section.rows.length - 1}
                    />
                  ))}
                </ul>
              )}
            </section>
          ),
        )
      )}
    </>
  );
}

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mx-1 mb-1.5 mt-[1.375rem] text-native-caption uppercase tracking-[0.02em] text-ink-faint">
      {children}
    </h2>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function MarketRow({
  supplier,
  showUniversity,
  extras,
  last,
}: {
  supplier: DirectorySupplier;
  showUniversity: boolean;
  extras: number;
  last: boolean;
}) {
  const meta = [
    supplier.kind === "shop" ? "Shop" : null,
    extras > 0 ? `${extras} ${extras === 1 ? "extra" : "extras"}` : null,
    showUniversity ? supplier.university : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <Link
        href={`/student/order?supplier=${supplier.id}`}
        className="flex items-center gap-3 px-3.5 py-[0.6875rem] transition-colors duration-[120ms] ease-[var(--ease-out)] active:bg-card-sunk"
      >
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card-sunk text-list-secondary font-semibold text-ink"
        >
          {initials(supplier.displayName)}
        </span>
        {/* The separator runs under the text only, inset past the avatar. */}
        <span
          className={`-mb-[0.6875rem] flex min-w-0 flex-1 flex-col gap-1 pb-[0.6875rem] ${
            last ? "" : "border-b-[0.5px] border-separator"
          }`}
        >
          <span className="truncate text-native-body font-medium text-ink">{supplier.displayName}</span>
          <span className="flex min-w-0 items-center gap-1.5">
            <PricePill label="Frasaco" price={supplier.frasacoPrice} dot="var(--frasaco)" bg="rgba(192,54,44,0.10)" />
            <PricePill label="Copy A" price={supplier.copyAPrice} dot="var(--copy-a)" bg="rgba(63,95,110,0.12)" />
            {meta && <span className="min-w-0 truncate text-native-caption text-ink-faint">{meta}</span>}
          </span>
        </span>
        <svg aria-hidden width="14" height="14" fill="none" stroke="var(--chevron)" strokeWidth={2.5} strokeLinecap="round" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}

function PricePill({ label, price, dot, bg }: { label: string; price: number; dot: string; bg: string }) {
  return (
    <span
      aria-label={`${label} $${price.toFixed(2)}`}
      className="tnum flex h-[1.375rem] shrink-0 items-center gap-[0.3125rem] rounded-full px-2 text-native-caption font-semibold text-ink"
      style={{ background: bg }}
    >
      <span aria-hidden className="h-[0.4375rem] w-[0.4375rem] rounded-full" style={{ background: dot }} />
      <span aria-hidden>${price.toFixed(2)}</span>
    </span>
  );
}
