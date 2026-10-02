"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/supplier",
    label: "Orders",
    icon: (
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    ),
  },
  {
    href: "/supplier/summary",
    label: "Summary",
    icon: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
  },
  {
    href: "/supplier/products",
    label: "Products",
    icon: (
      <>
        <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
        <path d="M3 8l9 5 9-5M12 13v8" />
      </>
    ),
  },
  {
    href: "/supplier/students",
    label: "Students",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </>
    ),
  },
  {
    href: "/supplier/settings",
    label: "Settings",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </>
    ),
  },
];

export function SupplierBottomNav() {
  const pathname = usePathname();

  return (
    // Opaque with a scroll-edge fade, matching the student nav. No
    // backdrop-filter: a blur layer fights the flat printed-paper design.
    <nav className="scroll-edge fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md items-center justify-around border-t border-rule bg-paper pb-6 pt-2">
      {ITEMS.map((item) => {
        const active = item.href === "/supplier" ? pathname === "/supplier" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="pressable flex min-h-11 min-w-11 flex-col items-center gap-1 px-3 py-1"
          >
            <svg
              className={`h-6 w-6 ${active ? "text-ink" : "text-ink-faint"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              viewBox="0 0 24 24"
            >
              {item.icon}
            </svg>
            <span className={`text-micro uppercase ${active ? "text-ink" : "text-ink-faint"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
