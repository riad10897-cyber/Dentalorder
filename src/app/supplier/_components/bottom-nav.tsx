"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Each icon as an outline (inactive) and a filled shape (active), drawn
// from the same outline so the two read as one icon. Lines that sit on a
// filled shape are cut out in paper.
const PAPER = { fill: "none", stroke: "var(--paper)", strokeWidth: 1.6, strokeLinecap: "round" as const };

const ITEMS = [
  {
    href: "/supplier",
    label: "Orders",
    outline: (
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    ),
    filled: (
      <>
        <path d="M7 5h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
        <path d="M9 12h6M9 16h4" {...PAPER} />
        <path d="M9.5 3.5h5v3h-5z" stroke="var(--paper)" strokeWidth={1.2} />
      </>
    ),
  },
  {
    href: "/supplier/summary",
    label: "Summary",
    outline: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
    filled: (
      <>
        <rect x="16" y="9" width="4" height="12" rx="1.5" />
        <rect x="10" y="3" width="4" height="18" rx="1.5" />
        <rect x="4" y="13" width="4" height="8" rx="1.5" />
      </>
    ),
  },
  {
    href: "/supplier/products",
    label: "Products",
    outline: (
      <>
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M3 8l9 5 9-5M12 13v8" />
      </>
    ),
    filled: (
      <>
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M3.5 8.3L12 13l8.5-4.7M12 13v7.5" {...PAPER} />
      </>
    ),
  },
  {
    href: "/supplier/students",
    label: "Students",
    outline: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </>
    ),
    filled: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2z" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/supplier/settings",
    label: "Settings",
    outline: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </>
    ),
    filled: (
      <>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        <circle cx="12" cy="12" r="3" fill="var(--paper)" />
      </>
    ),
  },
];

export function SupplierBottomNav() {
  const pathname = usePathname();

  // Glass ("Paper, native"), like the student tab bar: content scrolls
  // underneath. Solid paper under reduced transparency.
  return (
    <nav
      className="glass-tab fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md items-start justify-around border-t-[0.5px] border-rule pt-2"
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      {ITEMS.map((item) => {
        const active = item.href === "/supplier" ? pathname === "/supplier" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`pressable flex min-h-11 min-w-11 flex-col items-center gap-[0.1875rem] px-1.5 ${
              active ? "text-ink" : "text-ink-faint"
            }`}
          >
            <svg
              aria-hidden
              className="h-6 w-6"
              viewBox="0 0 24 24"
              {...(active
                ? { fill: "currentColor", stroke: "none" }
                : { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" })}
            >
              {active ? item.filled : item.outline}
            </svg>
            <span className="text-tab font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
