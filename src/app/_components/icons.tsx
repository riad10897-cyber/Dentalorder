import { Molo } from "./molo";
/*
 * The app's few line icons, drawn like the bottom nav's: 24-unit box,
 * round caps, stroke in the current text colour. Decoration only — every
 * icon sits beside a word that says the same thing, so all are
 * aria-hidden.
 */

type IconProps = { className?: string };

function Icon({ className = "h-5 w-5", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const PersonIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0116 0" />
  </Icon>
);

export const MailIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </Icon>
);

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </Icon>
);

export const StoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10v10h16V10" />
    <path d="M3 10l2-6h14l2 6a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0z" />
    <path d="M10 20v-5h4v5" />
  </Icon>
);

export const ChatIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />
  </Icon>
);

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
);

export const BoxIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </Icon>
);

export const ClipboardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4a1 1 0 011-1h4a1 1 0 011 1v2H9V4zM9 11h6M9 15h4" />
  </Icon>
);

export const PeopleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0113 0" />
    <path d="M16 4.6a3.5 3.5 0 010 6.8M18 14a6.5 6.5 0 013.5 6" />
  </Icon>
);

export const QrIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18v2M20 14v2" />
  </Icon>
);

/**
 * The empty state every list and screen gets: an icon, then a sentence.
 * Dashed, so it reads as "a place where things will be", not as content.
 */
export function EmptyState({
  icon,
  children,
  className = "",
  native = false,
  molo = false,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** "Paper, native": a plain inset group rather than a dashed box. */
  native?: boolean;
  /**
   * Sleepy Molo instead of the icon. Only on a screen's one real empty
   * list ("no orders yet"), never on a search with no match, never twice
   * on a screen. The sentence stays: Molo never replaces words.
   */
  molo?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 px-4 py-6 text-center ${
        native ? "rounded-group bg-card text-list-secondary" : "rounded-card border border-dashed border-rule text-small"
      } text-ink-muted ${className}`}
    >
      {molo ? <Molo mood="sleepy" size={120} handle={false} /> : <span className="text-ink-faint">{icon}</span>}
      <p>{children}</p>
    </div>
  );
}
