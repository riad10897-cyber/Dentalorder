// A drawn tick rather than an emoji, and it scales in from 0.7 with a
// slight overshoot — never from 0, because nothing in the real world
// appears out of nothing. Reduced motion turns this into a plain fade
// via the .tick-in rule in globals.css.
export function ConfirmIcon() {
  return (
    <div className="tick-in flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-full bg-ink">
      <svg
        width="38"
        height="38"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </div>
  );
}
