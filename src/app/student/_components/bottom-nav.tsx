"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Three tabs. Home is the market — there is no separate "Order" tab,
// because choosing who you buy from is the first step of ordering.
const ITEMS = [
  {
    href: "/student",
    label: "Home",
    icon: (
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    ),
    extra: <polyline points="9 22 9 12 15 12 15 22" />,
  },
  {
    href: "/student/orders",
    label: "Orders",
    icon: (
      <>
        <path d="M6 2h9l5 5v15a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" />
      </>
    ),
  },
  {
    href: "/student/profile",
    label: "Profile",
    icon: (
      <>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
  },
];

export function StudentBottomNav() {
  const pathname = usePathname();

  // Opaque, with a fade where content passes underneath. The design is
  // flat printed paper and a blur layer fights that, so this is
  // deliberately not backdrop-filter.
  return (
    <nav className="scroll-edge fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md items-center justify-around border-t border-rule bg-paper pb-6 pt-2">
      {ITEMS.map((item) => {
        const active =
          item.href === "/student" ? pathname === "/student" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="pressable flex min-h-11 min-w-11 flex-col items-center gap-1 px-4 py-1"
          >
            <svg
              className={`h-6 w-6 ${active ? "text-ink" : "text-ink-faint"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              viewBox="0 0 24 24"
            >
              {item.icon}
              {item.extra}
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
