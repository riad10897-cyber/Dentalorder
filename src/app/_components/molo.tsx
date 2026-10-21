// Molo, the Molaro mascot.
// A molar shaped like a shopping bag. Pure SVG, no hooks, works in server and client components.
// Motion lives in src/app/molo.css, imported once in the root layout.
// One Molo per screen: the body clip path has a fixed id.

import type { CSSProperties } from "react";

export type MoloMood = "idle" | "hello" | "gotit" | "handed" | "loading" | "sleepy" | "sad";
export type MoloFace = "happy" | "wink" | "wow" | "joy" | "sleepy" | "focus" | "sad";

export type MoloProps = {
  /** Width in px. Height is size * 1.05. */
  size?: number;
  /** Sets face, arms, extras and motion together. "idle" keeps Molo still apart from blinking. */
  mood?: MoloMood;
  /** Only used when mood is "idle". */
  face?: MoloFace;
  /** Show the bag handle. */
  handle?: boolean;
  /** Handle colour. Frasaco red by default; use paper (#F2EDE1) on red backgrounds. */
  handleColor?: string;
  /** Show the soft shadow under Molo. */
  ground?: boolean;
  /** Loop the mood forever (default). Set false to play it 3 times, then rest. */
  loop?: boolean;
  /** Set when Molo carries meaning on his own. Leave empty when a text label sits next to him. */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

const INK = "#14120F";
const SHADE = "#E6DCCB";
const BODY =
  "M80 330 C80 346 92 358 108 358 L292 358 C308 358 320 346 320 330 L320 156 C320 114 292 90 252 90 C222 90 207 106 200 130 C193 106 178 90 148 90 C108 90 80 114 80 156 Z";

const FACE_BY_MOOD: Record<Exclude<MoloMood, "idle">, MoloFace> = {
  hello: "happy",
  gotit: "wink",
  handed: "joy",
  loading: "focus",
  sleepy: "sleepy",
  sad: "sad",
};

function Arm({ d, fill }: { d: string; fill: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={INK} strokeWidth={32} strokeLinecap="round" />
      <path d={d} fill="none" stroke={fill} strokeWidth={14} strokeLinecap="round" />
    </>
  );
}

const ARM_L = {
  down: "M100 252 C70 266 58 292 62 318",
  up: "M100 240 C66 224 52 196 54 160",
};
const ARM_R = {
  down: "M300 252 C330 266 342 292 338 318",
  up: "M300 240 C334 224 348 196 346 160",
  wave: "M300 244 C336 236 360 212 364 176",
  fist: "M300 252 C338 256 356 236 352 206",
};

export function Molo({
  size = 160,
  mood = "idle",
  face = "happy",
  handle = true,
  handleColor = "#C0362C",
  ground = true,
  loop = true,
  label,
  className,
  style,
}: MoloProps) {
  const f: MoloFace = mood === "idle" ? face : FACE_BY_MOOD[mood];
  const eyesOpenL = f === "happy" || f === "wink" || f === "wow" || f === "focus" || f === "sad";
  const eyesOpenR = f === "happy" || f === "wow" || f === "focus" || f === "sad";
  const armL = mood === "handed" ? ARM_L.up : ARM_L.down;
  const armR =
    mood === "hello" ? ARM_R.wave : mood === "handed" ? ARM_R.up : mood === "gotit" ? ARM_R.fist : ARM_R.down;

  return (
    <svg
      className={["molo", `molo--${mood}`, loop ? null : "molo--once", className].filter(Boolean).join(" ")}
      width={size}
      height={Math.round(size * 1.05)}
      viewBox="0 0 400 420"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", overflow: "visible", ...style }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true, focusable: false })}
    >
      <defs>
        <clipPath id="molo-clip">
          <path d={BODY} />
        </clipPath>
      </defs>

      {ground && <ellipse className="molo-ground" cx={200} cy={402} rx={116} ry={11} fill={INK} fillOpacity={0.18} />}

      <g className="molo-figure">
        {handle && (
          <>
            <path d="M150 126 C150 22 250 22 250 126" fill="none" stroke={INK} strokeWidth={36} strokeLinecap="round" />
            <path d="M150 126 C150 22 250 22 250 126" fill="none" stroke={handleColor} strokeWidth={16} strokeLinecap="round" />
          </>
        )}

        <g className="molo-arm-l">
          <Arm d={armL} fill="#FFFFFF" />
        </g>
        <g className="molo-arm-r">
          <Arm d={armR} fill="#EFE7DA" />
        </g>

        {/* Root legs */}
        <path d="M126 340 C124 372 128 394 144 396 C160 398 164 380 168 350 Z" fill="#FFFFFF" stroke={INK} strokeWidth={10} strokeLinejoin="round" />
        <path d="M274 340 C276 372 272 394 256 396 C240 398 236 380 232 350 Z" fill={SHADE} stroke={INK} strokeWidth={10} strokeLinejoin="round" />

        {/* Body: flat white with a shaded crescent on the right */}
        <g clipPath="url(#molo-clip)">
          <path d={BODY} fill={SHADE} />
          <path d={BODY} fill="#FFFFFF" transform="translate(-22 -16)" />
          <rect x={60} y={60} width={236} height={120} fill="#FFFFFF" />
        </g>
        <path d={BODY} fill="none" stroke={INK} strokeWidth={10} strokeLinejoin="round" />

        {/* Cheeks */}
        <ellipse cx={130} cy={262} rx={21} ry={11} fill="#F2A595" fillOpacity={0.8} />
        <ellipse cx={270} cy={262} rx={21} ry={11} fill="#F2A595" fillOpacity={0.8} />

        {/* Eyes */}
        <g className="molo-look">
          {eyesOpenL && (
            <g className="molo-eye">
              <ellipse cx={162} cy={226} rx={14} ry={19} fill={INK} />
              <circle cx={167} cy={218} r={5} fill="#FFFFFF" />
            </g>
          )}
          {eyesOpenR && (
            <g className="molo-eye">
              <ellipse cx={238} cy={226} rx={14} ry={19} fill={INK} />
              <circle cx={243} cy={218} r={5} fill="#FFFFFF" />
            </g>
          )}
        </g>

        <g fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round">
          {f === "joy" && <path d="M146 234 C152 216 172 216 178 234" />}
          {(f === "joy" || f === "wink") && <path d="M222 234 C228 216 248 216 254 234" />}
          {f === "sleepy" && (
            <>
              <path d="M146 224 C152 238 172 238 178 224" />
              <path d="M222 224 C228 238 248 238 254 224" />
            </>
          )}
          {(f === "happy" || f === "wink") && <path d="M178 264 C190 282 210 282 222 264" />}
          {(f === "sleepy" || f === "focus") && <path d="M190 272 C196 276 204 276 210 272" />}
          {/* Sad: a small frown and brows tipped up in the middle. Only on
              the screens where something on our side went wrong. */}
          {f === "sad" && (
            <>
              <path d="M184 282 C192 268 208 268 216 282" />
              <path d="M146 196 C156 192 166 192 176 186" strokeWidth={7} />
              <path d="M254 196 C244 192 234 192 224 186" strokeWidth={7} />
            </>
          )}
        </g>
        {(f === "wow" || f === "joy") && (
          <g>
            <path d="M176 260 C178 298 222 298 224 260 Z" fill={INK} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
            <path d="M188 284 C194 276 206 276 212 284 C206 290 194 290 188 284 Z" fill="#E86F5E" />
          </g>
        )}
      </g>

      {/* Mood extras */}
      {mood === "hello" && (
        <g fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round">
          <path className="molo-fx" d="M386 150 C396 162 398 178 394 192 M406 136 C420 156 422 182 416 202" />
        </g>
      )}
      {mood === "gotit" && (
        <g transform="translate(346 82)">
          <path
            className="molo-fx"
            d="M0 -26 C4 -6 6 -4 26 0 C6 4 4 6 0 26 C-4 6 -6 4 -26 0 C-6 -4 -4 -6 0 -26 Z"
            fill="#C0362C"
            stroke={INK}
            strokeWidth={5}
            strokeLinejoin="round"
          />
        </g>
      )}
      {mood === "handed" && (
        <g stroke={INK} strokeWidth={4} strokeLinejoin="round">
          <g transform="translate(64 96) rotate(-20)"><rect className="molo-confetti" x={-7} y={-11} width={14} height={22} rx={3} fill="#C0362C" /></g>
          <g transform="translate(118 40)"><circle className="molo-confetti" style={{ animationDelay: "-0.4s" }} r={9} fill="#3F5F6E" /></g>
          <g transform="translate(284 34) rotate(30)"><rect className="molo-confetti" style={{ animationDelay: "-0.8s" }} x={-7} y={-11} width={14} height={22} rx={3} fill="#3F5F6E" /></g>
          <g transform="translate(342 96) rotate(15)"><rect className="molo-confetti" style={{ animationDelay: "-0.2s" }} x={-7} y={-11} width={14} height={22} rx={3} fill="#C0362C" /></g>
          <g transform="translate(200 -6)"><circle className="molo-confetti" style={{ animationDelay: "-0.6s" }} r={8} fill="#C0362C" /></g>
          <g transform="translate(26 150)"><circle className="molo-confetti" style={{ animationDelay: "-1s" }} r={7} fill="#F2EDE1" /></g>
          <g transform="translate(376 150) rotate(-25)"><rect className="molo-confetti" style={{ animationDelay: "-0.5s" }} x={-6} y={-10} width={12} height={20} rx={3} fill="#F2EDE1" /></g>
        </g>
      )}
      {mood === "sleepy" && (
        <g fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
          <g transform="translate(318 118)"><path className="molo-z" d="M-13 -13 L13 -13 L-13 13 L13 13" /></g>
          <g transform="translate(352 70)"><path className="molo-z" style={{ animationDelay: "-1.8s" }} d="M-9 -9 L9 -9 L-9 9 L9 9" /></g>
        </g>
      )}
      {mood === "loading" && (
        <g fill={INK}>
          <g transform="translate(302 106)"><circle className="molo-dot" r={9} /></g>
          <g transform="translate(330 92)"><circle className="molo-dot" style={{ animationDelay: "0.15s" }} r={9} /></g>
          <g transform="translate(358 78)"><circle className="molo-dot" style={{ animationDelay: "0.3s" }} r={9} /></g>
        </g>
      )}
    </svg>
  );
}

export default Molo;
