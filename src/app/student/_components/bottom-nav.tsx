"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
    href: "/student/order",
    label: "Order",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
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
