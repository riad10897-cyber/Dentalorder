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

/** The row's icon, in the muted ink every row's icon shares. */
function RowIcon({ icon }: { icon?: React.ReactNode }) {
  return icon ? <span className="shrink-0 text-ink-muted">{icon}</span> : null;
}

export function MenuLink({
  href,
  label,
  detail,
  icon,
}: {
  href: string;
  label: string;
  detail?: string;
  icon?: React.ReactNode;
}) {
  return (
    <li className="border-b border-hairline last:border-none">
      <Link href={href} className={`pressable ${rowClass}`}>
        <RowIcon icon={icon} />
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
export function MenuInfo({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <li className={`border-b border-hairline last:border-none ${rowClass}`}>
      <RowIcon icon={icon} />
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

/**
 * The top of every pushed screen — anything opened from somewhere else,
 * as opposed to a tab. Back arrow on the left, the title beside it, one
 * optional line under the title, and an optional intro underneath. The
 * same on every such screen, so the way back is always in the same place.
 */
export function PushedHeader({
  backHref,
  backLabel,
  backText,
  title,
  subtitle,
  intro,
  native = false,
}: {
  backHref: string;
  backLabel: string;
  /** The previous screen's title, shown beside the chevron on native bars ("Market"). */
  backText?: string;
  title: string;
  subtitle?: React.ReactNode;
  intro?: string;
  /** "Paper, native" (student screens): a fixed glass bar, title centred. */
  native?: boolean;
}) {
  if (native) {
    return (
      <>
        <header
          className="glass-bar fixed inset-x-0 top-0 z-30 mx-auto w-full max-w-md border-b-[0.5px] border-[rgba(20,18,15,0.14)]"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="relative flex h-[3.75rem] items-center px-2">
            <Link
              href={backHref}
              aria-label={backLabel}
              className="pressable relative z-10 flex h-11 max-w-[40%] items-center gap-1.5 rounded-control pl-1 pr-2 text-nav-title text-ink"
            >
              <svg
                aria-hidden
                width="12"
                height="20"
                viewBox="0 0 12 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[1.25rem] w-[0.75rem] shrink-0"
              >
                <path d="M10 2L2 10l8 8" />
              </svg>
              {backText && <span className="truncate">{backText}</span>}
            </Link>
            <h1 className="pointer-events-none absolute inset-x-0 mx-auto max-w-[50%] truncate text-center text-nav-title font-semibold text-ink">
              {title}
            </h1>
          </div>
        </header>
        {/* Holds the bar's place: content starts below it and scrolls under. */}
        <div aria-hidden style={{ height: "calc(3.75rem + env(safe-area-inset-top))" }} />
        {(subtitle || intro) && (
          <div className="px-5 pt-3">
            {subtitle && <div className="text-native-caption text-ink-muted">{subtitle}</div>}
            {intro && <p className="mt-1 text-list-secondary text-ink-muted">{intro}</p>}
          </div>
        )}
      </>
    );
  }

  return (
    <header className="px-5 pt-5">
      <div className="flex items-center gap-2">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="pressable -ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink"
        >
          <svg aria-hidden width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-title text-ink">{title}</h1>
          {subtitle && <div className="truncate text-caption text-ink-muted">{subtitle}</div>}
        </div>
      </div>
      {intro && <p className="mt-2 text-small text-ink-muted">{intro}</p>}
    </header>
  );
}

export const APP_VERSION = "0.1.0";

/** "BAU · Year 4", or as much of it as is known. */
export function describeStudy(university: string | null, year: number | null): string {
  const parts = [university, year ? `Year ${year}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Student";
}
