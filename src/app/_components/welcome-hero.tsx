import { Molo } from "./molo";

// A small molar outline, the shape the app is about. Drawn in paper and
// faint ink, never in Frasaco red or Copy A blue: those colours mean the
// two tooth types and nothing else.
function Tooth({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} style={style}>
      <path
        d="M7 3C5 3 3.5 4.6 3.5 7c0 3 1 4.5 1.5 8 .3 2 1 6 2.5 6s1.6-4 2.5-4h1c.9 0 1 4 2.5 4s2.2-4 2.5-6c.5-3.5 1.5-5 1.5-8 0-2.4-1.5-4-3.5-4-1.5 0-2 1-3 1h-1c-1 0-1.5-1-3-1z"
        fill="var(--card)"
        stroke="var(--ink-faint)"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Sparkle({ className, style }: { className: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} style={style}>
      <path d="M12 2c.6 5 1.9 7.4 10 10-8.1 2.6-9.4 5-10 10-.6-5-1.9-7.4-10-10 8.1-2.6 9.4-5 10-10z" fill="var(--ink)" />
    </svg>
  );
}

/**
 * The welcome screen's Molo: he rises in once, then floats, waves and
 * looks around on a soft halo while a few paper teeth drift up behind him
 * and two small sparkles twinkle. Slow on purpose (6–9 s loops), so the
 * screen feels alive without asking for attention. Reduced motion: he
 * stands still and the shapes only fade gently.
 */
export function WelcomeHero() {
  return (
    <div className="welcome-hero relative mx-auto h-[15rem] w-[17rem]" aria-hidden>
      <span className="welcome-halo absolute left-1/2 top-[52%] h-[12.5rem] w-[12.5rem] rounded-full" />

      <Tooth className="welcome-drift absolute left-[6%] top-[58%] h-7 w-7" style={{ animationDelay: "-1s" }} />
      <Tooth className="welcome-drift absolute right-[4%] top-[48%] h-5 w-5" style={{ animationDelay: "-4.5s", animationDuration: "9s" }} />
      <Tooth className="welcome-drift absolute left-[20%] top-[18%] h-4 w-4" style={{ animationDelay: "-6.5s", animationDuration: "8s" }} />
      <Sparkle className="welcome-twinkle absolute right-[14%] top-[12%] h-4 w-4" />
      <Sparkle className="welcome-twinkle absolute left-[9%] top-[34%] h-3 w-3" style={{ animationDelay: "-1.6s" }} />

      <div className="welcome-rise absolute inset-x-0 bottom-0 flex justify-center">
        <div className="welcome-float">
          <Molo mood="hello" size={160} />
        </div>
      </div>
    </div>
  );
}
