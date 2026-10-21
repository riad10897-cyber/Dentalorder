# Molo kit for the Molaro app

Everything needed to put Molo and the new logo into the app for the BAU pilot.

## What's here

| File | What it is |
| --- | --- |
| `Molo.tsx` | Molo as a React component. Pure SVG, no dependencies, type-checked. |
| `molo.css` | All of Molo's motion. Import once, globally. |
| `assets/molo/*.svg` | Static Molo in each mood, for emails, docs and anywhere code can't run. |
| `assets/icons/*` | App icon at 1024, 512, 192, 180 (Apple touch), favicon 32, 16 and `.ico`. |

## Install

1. Copy `Molo.tsx` to `src/components/Molo.tsx`.
2. Copy `molo.css` next to it and import it once in the root layout (or `@import` it from the global stylesheet).
3. Copy `assets/icons/*` to `public/`. Point the web manifest and `<link rel="apple-touch-icon">` at them (snippet below).
4. Load Fraunces for the wordmark (snippet below). Body text stays Atkinson Hyperlegible.

```tsx
import { Molo } from "@/components/Molo";

<Molo mood="hello" size={140} />
```

### Props

| Prop | Default | Notes |
| --- | --- | --- |
| `mood` | `"idle"` | `idle`, `hello`, `gotit`, `handed`, `loading`, `sleepy`. Sets face, arms, extras and motion together. |
| `size` | `160` | Width in px. Height is `size × 1.05`. |
| `loop` | `true` | `false` plays the move 3 times, then Molo rests. Use it on confirmation screens. |
| `handle` | `true` | Hide the bag handle when Molo is very small or sleeping. |
| `handleColor` | `#C0362C` | Use paper `#F2EDE1` when Molo sits on a red background. |
| `ground` | `true` | The soft shadow under his feet. |
| `label` | none | Leave empty when text next to Molo says the same thing (most cases). Molo is then hidden from screen readers, like the design system's icons. |
| `face` | `"happy"` | Only used with `mood="idle"`. |

## Where Molo appears

| Screen | Mood | Size | Loop | Copy next to him |
| --- | --- | --- | --- | --- |
| Welcome and sign in | `hello` | 160 | yes | Keep the existing sign in copy. |
| Order placed confirmation | `gotit` | 120 | no | "Waiting for Riad to confirm" style status, unchanged. |
| Order handed over | `handed` | 140 | no | "Handed over" status, unchanged. |
| Loading a list or order (over ~400 ms) | `loading` | 96 | yes | None needed, he replaces the spinner. |
| Empty lists (no orders yet, empty cart) | `sleepy` | 120 | yes | The existing one sentence empty state line. |

Rules that keep him charming instead of annoying:

- One Molo per screen, never in lists, cards or the tab bar.
- Screens people see often (the orders tab, the catalogue) get Molo only in their empty or loading state, never as decoration.
- Molo never replaces words. Every state still has its text.
- Errors stay in ink. Molo appears only as his sad self, and only on the crash and not-found screens, never beside an inline error. Red means Frasaco only, so Molo never signals a problem in red.
- Show `loading` only after ~400 ms, so fast loads don't flash him.
- Reduced motion is built in: movement stops, only gentle fades remain.

## Wordmark

"molaro" in Fraunces, weight 800, soft and wonky axes on, with the final "o" in Frasaco red. On red, the "o" turns ink.

```tsx
// app/layout.tsx
import { Fraunces } from "next/font/google";
export const fraunces = Fraunces({ subsets: ["latin"], weight: "variable", axes: ["SOFT", "WONK", "opsz"], variable: "--font-fraunces" });
```

```tsx
export function Wordmark({ size = "2.5rem", onRed = false }) {
  return (
    <span
      aria-label="Molaro"
      style={{
        fontFamily: "var(--font-fraunces), Georgia, serif",
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
```

This replaces the README rule "There is no Molaro logo yet" in the design system.

## App icon

```json
{
  "name": "Molaro",
  "short_name": "Molaro",
  "icons": [
    { "src": "/molaro-icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/molaro-icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "theme_color": "#C0362C",
  "background_color": "#F2EDE1"
}
```

```html
<link rel="apple-touch-icon" href="/apple-touch-icon-180.png" />
<link rel="icon" href="/favicon.ico" sizes="any" />
```

## Seeing how it goes in the BAU pilot

No extra screens needed. Watch three things during the semester:

1. Do students mention Molo or screenshot him without being asked?
2. Does anyone say the motion is too much? If so, switch `loop` to `false` on that screen first.
3. Ask five students in person after their first handed over order: "What did you think of the little tooth?"

## Prompt for Claude Code

Paste this into Claude Code inside the Molaro repo, with this kit folder copied into the repo root:

> Add the Molo mascot from `molo-kit/`. Copy `Molo.tsx` to `src/components/`, import `molo.css` once globally, copy `assets/icons/*` to `public/` and wire the web manifest, apple touch icon and favicon. Load Fraunces with next/font (axes SOFT, WONK, opsz) and add the `Wordmark` component from `molo-kit/README.md`. Then place Molo exactly as the "Where Molo appears" table in that README says, following its rules. Keep all existing copy. Don't add Molo anywhere else. Show me each screen you changed when done.
