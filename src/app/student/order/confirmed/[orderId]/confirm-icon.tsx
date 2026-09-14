// A drawn tick rather than an emoji, and it scales in from 0.7 with a
// slight overshoot — never from 0, because nothing in the real world
// appears out of nothing. Reduced motion turns this into a plain fade
// via the .tick-in rule in globals.css.
export function ConfirmIcon() {
  return (
    <div className="tick-in mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-ink">
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--card)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4.5 12.5l5 5 10-11" />
      </svg>
    </div>
  );
}
