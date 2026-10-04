"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Three tabs. Market is home — there is no separate "Order" tab,
// because choosing who you buy from is the first step of ordering.
// Each icon comes as an outline (inactive) and a filled shape (active),
// drawn from the same outline so the two read as one icon.
const ITEMS = [
  {
    href: "/student",
    label: "Market",
    outline: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
    // The door is left open in the fill rather than drawn on top.
    filled: <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2h-4v-8H9v8H5a2 2 0 01-2-2z" />,
  },
  {
    href: "/student/orders",
    label: "Orders",
    outline: (
      <>
        <path d="M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" />
      </>
    ),
    filled: (
      <>
        <path d="M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" fill="none" stroke="var(--paper)" strokeWidth={1.6} strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/student/profile",
    label: "Profile",
    outline: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    filled: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2z" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
];

export function StudentBottomNav() {
  const pathname = usePathname();

  // Glass ("Paper, native"): content scrolls underneath it, so there is
  // no fade at the edge any more. Solid paper under reduced transparency.
  return (
    <nav
      className="glass-tab fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md items-start justify-around border-t-[0.5px] border-rule pt-2"
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      {ITEMS.map((item) => {
        const active =
          item.href === "/student" ? pathname === "/student" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`pressable flex min-h-11 min-w-16 flex-col items-center gap-[0.1875rem] px-3 ${
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
