import { Fraunces } from "next/font/google";

// The wordmark's own face. Fraunces is for the logo only: every other
// word in the app stays in the system font ("Paper, native"). Loaded
// here, so only pages that show the wordmark download it.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

/**
 * "molaro" in Fraunces 800, soft and wonky, the final "o" in Frasaco red
 * (ink on a red ground). From the Molo kit, design/molo-kit/README.md.
 */
export function Wordmark({ size = "2.5rem", onRed = false }: { size?: string; onRed?: boolean }) {
  return (
    <span
      className={fraunces.className}
      style={{
        fontWeight: 800,
        fontSize: size,
        lineHeight: 0.9,
        letterSpacing: "-0.03em",
        fontVariationSettings: "'SOFT' 100, 'WONK' 1, 'opsz' 144",
        color: onRed ? "#F2EDE1" : "#14120F",
      }}
    >
      molar<span style={{ color: onRed ? "#14120F" : "#C0362C" }}>o</span>
    </span>
  );
}
