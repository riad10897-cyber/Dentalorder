# Replacement for the "## Design system" section of CLAUDE.md

Owner decision, 4 Oct 2026: the student app moves to a native-iOS feel
(prototype option 1c). This section REPLACES the old "## Design system"
section of CLAUDE.md in full. Where the old text and this text disagree,
this text wins. Do not argue the old rules back in.

## Design system — "Paper, native"

Warm paper palette, iOS structure. Light only — still no dark mode.

```css
--paper:      #F2EDE1;   /* page background */
--card:       #FBF8F0;   /* grouped-list cells, sheets */
--card-sunk:  #EFE8D9;   /* avatars, pressed cell */
--fill:       rgba(20,18,15,0.07);  /* search field, segmented track, steppers, secondary buttons */
--fill-faint: rgba(20,18,15,0.05);  /* inset groups inside sheets */
--ink:        #14120F;
--ink-muted:  #5E574C;
--ink-faint:  #8A8175;
--chevron:    #B5AD9F;
--rule:       rgba(20,18,15,0.16);
--separator:  rgba(20,18,15,0.12);  /* 0.5px list separators */
--glass:      rgba(242,237,225,0.72);  /* nav bars, tab bar (0.78) */
--glass-card: rgba(251,248,240,0.76);  /* floating total bar */
--frasaco:    #C0362C;   /* Frasaco, and only Frasaco */
--copy-a:     #3F5F6E;   /* Copy A, and only Copy A */
--fulfilled:  #4A6B41;   /* fulfilled status + the hold-to-place fill, nothing else */
```

- **Light only.** No dark mode.
- Colour jobs are unchanged: Frasaco red and Copy A blue mean only those
  tooth types; green means handed over (and fills the hold-to-place button,
  which is the moment an order becomes real).
- **Font: the system font** — `-apple-system, BlinkMacSystemFont, system-ui, sans-serif`.
  Newsreader and Atkinson Hyperlegible are retired from the student app.
  Weights 400 / 500 / 600 / 700.
- Type scale (rem): large title 2.125 / 700 / −0.02em · screen title 1.75 / 700 / −0.02em ·
  sheet title 1.375 / 700 / −0.01em · nav title 1.0625 / 600 · body 1.0625 ·
  list secondary 0.9375 · caption 0.8125 · tab label 0.625 / 600.
  `tabular-nums` on every price, count and total — unchanged.
- **Every size in rem**, unchanged. Tap targets ≥ 44×44, unchanged. 375px, unchanged.
- **Radii:** segmented thumb 0.4375rem · segmented track 0.5625rem · search field 0.625rem ·
  tooth 0.6875rem · grouped list 0.875rem · buttons in sheets 1rem–1.125rem ·
  reorder card 1rem · chart card 1.125rem · floating bar 1.5rem · sheets 2rem · pills 999px.
- **Blur is allowed** on exactly three surfaces: nav bars, the tab bar, and the
  floating total bar — `backdrop-filter: blur(20px) saturate(180%)`
  (24px on the floating bar). Nowhere else. Never stack glass on glass.
- **Shadows are allowed** on floating surfaces only: floating total bar
  `0 8px 28px rgba(20,18,15,0.16)`, sheets `0 10px 40px rgba(20,18,15,0.22)`,
  segmented thumb `0 3px 8px rgba(20,18,15,0.12), 0 1px 1px rgba(20,18,15,0.06)`.
- Separators are 0.5px `--separator`, inset to start after the avatar.
- Every list and empty view still gets a designed empty state.

### Motion (curves unchanged, additions marked NEW)

`--ease-out`, `--ease-in-out`, `--ease-drawer` keep their exact values.

- Press feedback: `.pressable` stays (scale 0.97, 120ms). Capsule buttons use 0.94–0.95.
- NEW `--ease-spring-pop: cubic-bezier(0.34, 1.56, 0.64, 1)` — used ONLY for a
  tooth becoming selected (scale 0.92 → 1, 380ms). Not on anything else.
- Segmented thumb slides on `--ease-drawer`, 320ms, transform only.
- Sheets keep the existing BottomSheet physics (momentum projection,
  rubber-band, velocity hand-off). Unchanged.
- `prefers-reduced-motion`, `prefers-reduced-transparency` (glass → solid
  `--paper` / `--card`, no blur), `prefers-contrast` and `(hover: hover)`
  gates still ship with the motion.
