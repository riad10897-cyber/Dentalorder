import Link from "next/link";
import { signOut } from "@/app/actions/auth";

/*
 * The pieces every settings screen is built from, for students and sellers
 * alike: a card saying whose account this is, grouped rows that each open
 * their own screen, and sign out on its own at the bottom. The same layout
 * as the settings of any phone app, so nobody has to learn it.
 */

export function AccountHeader({ name, detail }: { name: string; detail: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  return (
    <div className="mx-5 mt-5 flex items-center gap-3 rounded-card border border-rule bg-card px-4 py-4">
      <span
        aria-hidden
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card-sunk font-display text-title text-ink"
      >
        {initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-title text-ink">{name}</span>
        <span className="block truncate text-small text-ink-muted">{detail}</span>
      </span>
    </div>
  );
}

export function MenuGroup({
  title,
  footnote,
  children,
}: {
  title: string;
  footnote?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-5 mt-6">
      <h2 className="px-0.5 pb-1.5 text-micro uppercase text-ink-faint">{title}</h2>
      <ul className="overflow-hidden rounded-card border border-rule bg-card">{children}</ul>
      {footnote && <p className="mt-1.5 px-0.5 text-caption text-ink-muted">{footnote}</p>}
    </section>
  );
}

const rowClass = "flex min-h-12 items-center gap-3 px-4 py-2.5";

export function MenuLink({ href, label, detail }: { href: string; label: string; detail?: string }) {
  return (
    <li className="border-b border-hairline last:border-none">
      <Link href={href} className={`pressable ${rowClass}`}>
        <span className="shrink-0 text-body text-ink">{label}</span>
        <span className="min-w-0 flex-1 truncate text-right text-small text-ink-muted">{detail}</span>
        <svg
          aria-hidden
          className="h-4 w-4 shrink-0 text-ink-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          viewBox="0 0 24 24"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}

/** A row that only shows something: no chevron, nothing to open. */
export function MenuInfo({ label, value }: { label: string; value: string }) {
  return (
    <li className={`border-b border-hairline last:border-none ${rowClass}`}>
      <span className="shrink-0 text-body text-ink">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-small text-ink-muted">{value}</span>
    </li>
  );
}

export function SignOutRow() {
  return (
    <form action={signOut} className="mx-5 mt-6">
      <button
        type="submit"
        className="pressable flex min-h-12 w-full items-center justify-center rounded-card border border-rule bg-card px-4 font-display text-body text-ink"
      >
        Sign out
      </button>
    </form>
  );
}

/** The top of a screen opened from a menu: back to the menu, and a title. */
export function PushedHeader({
  backHref,
  backLabel,
  title,
  intro,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  intro?: string;
}) {
  return (
    <header className="px-5 pt-4">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="pressable -ml-2.5 flex h-11 w-11 items-center justify-center rounded-control text-ink"
      >
        <svg aria-hidden width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </Link>
      <h1 className="mt-1 font-display text-heading text-ink">{title}</h1>
      {intro && <p className="mt-1 text-small text-ink-muted">{intro}</p>}
    </header>
  );
}

export const APP_VERSION = "0.1.0";

/** "BAU · Year 4", or as much of it as is known. */
export function describeStudy(university: string | null, year: number | null): string {
  const parts = [university, year ? `Year ${year}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Student";
}
