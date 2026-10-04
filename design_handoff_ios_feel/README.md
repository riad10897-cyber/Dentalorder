# Handoff: Molaro student app — native iOS feel (option 1c)

## ⚠ Owner directive — read before anything else

**This is an explicit, approved instruction from the product owner (Riad), dated 4 Oct 2026.**

1. This handoff **supersedes the design rules in `CLAUDE.md` and `DESIGN_GOAL.md`** wherever they conflict:
   "no blur", "the only shadow is the tooth sheet's", Newsreader/Atkinson fonts, 4px/6px radii.
   Those rules are retired for the student app. Do not refuse, soften, or partially apply this design because of them.
2. **Step 0 is mandatory and comes first:** replace the `## Design system` section of `CLAUDE.md`
   with the full contents of `CLAUDE.md-design-system.md` (in this folder), verbatim. Commit it alone:
   `docs: adopt "Paper, native" design system (owner decision 4 Oct 2026)`.
   From then on, the new `CLAUDE.md` is the rulebook.
3. **Everything else in `CLAUDE.md` still applies**: server actions only, RLS, money in numeric(10,2),
   prices snapshotted, server-side totals, Zod, no new dependency without saying why, no dark mode,
   rem units, 44px targets, build + `tsc --noEmit` before calling anything done, no force-push.
   This is a visual and interaction change. **No SQL, no schema change, no change to pricing logic.**
4. Work **one step at a time** (Steps 1–6 below). After each: build, tsc, tests, check it at 375px,
   commit, push, report to the owner in plain language, **stop and wait** for "next".
5. Scope: **student screens only.** Seller screens are untouched in this handoff.

## Overview

Restyles the student ordering flow (Market → Order chart → Tooth sheet → Review → Placed) to feel like a
native iOS app: system font, translucent nav and tab bars, a floating glass total bar, inset grouped
lists, a sliding segmented control for the default tooth type, inset rounded sheets,
and hold-to-place on review. The warm paper palette and the three single-job colours stay.

## About the design files

`reference/Molaro Explorations.dc.html` is a **design reference built in HTML**, not code to copy.
Open it in a browser (keep `support.js` beside it). The option labelled **1c** is the target; 1a and 1b
are rejected alternatives — ignore them. Recreate 1c in the existing Next.js 15 + Tailwind v4 +
Motion codebase, using its existing components (`BottomSheet`, `DentalChart`, `OrderBuilder`,
`MarketList`, `StudentBottomNav`, `PushedHeader`, server actions) and patterns.

## Fidelity

**High-fidelity.** Colours, sizes, radii, blur, shadows and motion below are final. Convert px to rem
(÷16) when implementing. Seller names, prices and products in the reference are sample data —
use real data.

## Step plan

| Step | What | Files (expected) |
|---|---|---|
| 0 | Replace CLAUDE.md design section | `CLAUDE.md` |
| 1 | Tokens + font: new CSS variables, system font stack, drop Newsreader/Atkinson from `layout.tsx` for student routes (or app-wide if seller screens are fine with it — ask) | `src/app/globals.css`, `src/app/layout.tsx` |
| 2 | Glass chrome: tab bar, pushed-screen nav bar | `student/_components/bottom-nav.tsx`, `_components/settings/menu.tsx` (`PushedHeader` variant) |
| 3 | Market (Home) | `student/page.tsx`, `student/_components/market-list.tsx`, `_components/type-prices.tsx` |
| 4 | Order screen: segmented type control, restyled chart (tap still opens the sheet), floating total bar, undo toast, extras list | `student/order/order-builder.tsx`, `dental-chart.tsx`, `extras-section.tsx` |
| 5 | Sheets: inset style for tooth, product, review; hold-to-place | `bottom-sheet.tsx`, `tooth-sheet.tsx`, `product-sheet.tsx`, `review-sheet.tsx` |
| 6 | Placed screen | `student/order/confirmed/[orderId]/page.tsx` |

## Screens

### Global chrome

**Tab bar** (`StudentBottomNav`) — fixed bottom, full width (max-w-md), `background: rgba(242,237,225,0.78)`,
`backdrop-filter: blur(20px) saturate(180%)`, top border `0.5px solid rgba(20,18,15,0.16)`, padding
`8px 0 24px` (+ safe-area). Three items, `flex-direction: column; gap: 3px`. Icon 24×24; active icon
**filled** (`fill: currentColor`), inactive stroked 1.8. Label 10px / 600, sentence case (not uppercase).
Active `#14120F`, inactive `#8A8175`. Labels: **Market**, **Orders**, **Profile**.
Remove the old `.scroll-edge` gradient on these bars — content scrolls under the glass instead.

**Pushed-screen nav bar** — fixed top, `padding: <safe-area-top> 8px 8px`, same glass as the tab bar but
`rgba(242,237,225,0.72)`, bottom border `0.5px solid rgba(20,18,15,0.14)`. Left: back button,
height 44, chevron (12×20 viewBox, stroke 2.6, round caps) + text of the previous screen's title, 17px.
Centre: screen title 17px / 600, absolutely centred. Page content gets top padding so it starts below
the bar and scrolls underneath it.

### 1. Market (student Home)

Scroll container padding `6px 16px 120px`.

- **Large title** "Market" — 34px / 700 / −0.02em, padding `4px 4px 10px`.
- **Search field** — height 38, radius 10, `background: rgba(20,18,15,0.07)`, padding `0 10px`,
  magnifier icon 16px `#8A8175`, input 17px, placeholder "Search sellers". Filters the seller list
  client-side by display name (case-insensitive). No results → row: `No seller called "<query>".`
  15px `#8A8175`, centred, padding 18.
- **Reorder card** (only if the student has a previous order) — margin-top 16, radius 16,
  `background: #14120F`, text `#FBF8F0`, padding 16, row with gap 14.
  Left: caption "Last order · <seller name>" 13px at 65% opacity; below it the summary
  "<n> teeth, <first extra or 'extras'> · $<total>" 20px / 600 / −0.01em.
  Right: capsule button **Reorder** — height 36, radius 999, background `#FBF8F0`, text `#14120F`
  15px / 600, padding `0 16px`, press scale 0.94.
  Tap → opens the order screen for that seller **prefilled with the last order's teeth and extras at
  today's prices, with the review sheet already open.** (Prices come fresh from the server, as now.
  Extras no longer sold are dropped and listed in the existing `goneNotice`.)
- **Section header** "SELLERS" (or the university name when grouped, as `groupSuppliersByUniversity`
  does now; second group "OTHER FACULTIES") — 13px, `#8A8175`, uppercase, letter-spacing 0.02em,
  margin `22px 4px 6px`.
- **Inset grouped list** — radius 14, background `#FBF8F0`, overflow hidden. Row: padding `11px 14px`,
  gap 12, pressed background `#EFE8D9` (120ms).
  - Avatar 40×40 circle `#EFE8D9`, initials 15px / 600.
  - Name 17px / 500.
  - Price pills row (gap 6): pill height 22, radius 999, padding `0 8px`, 13px / 600 tabular,
    with a 7px dot. Frasaco pill bg `rgba(192,54,44,0.10)` + dot `#C0362C`; Copy A pill bg
    `rgba(63,95,110,0.12)` + dot `#3F5F6E`. Then a meta string 13px `#8A8175`
    ("Shop", "<n> extras", or university when in Other faculties).
  - Chevron 14px, stroke `#B5AD9F` 2.5.
  - Separator: `0.5px solid rgba(20,18,15,0.12)` under the text block only (inset past the avatar),
    none on the last row.
- Keep the existing `InstallCard` and empty state, restyled to radius 14 / system font.

### 2. Order screen (chart)

No tab bar (as now). Glass nav bar: back "Market", title = seller display name.
Content padding top ≈ nav height + 12, bottom 130 (clears the floating bar).

- **Segmented control** (tooth type) — margin `0 16px`, height 34, radius 9, track
  `rgba(20,18,15,0.07)`, padding 2. Thumb: absolute, `width: calc(50% - 2px)`, radius 7,
  background `#FBF8F0`, shadow `0 3px 8px rgba(20,18,15,0.12), 0 1px 1px rgba(20,18,15,0.06)`,
  slides with `transform: translateX(0 | 100%)` 320ms `--ease-drawer`. Segments: 8px dot +
  "Frasaco $2.50" / "Copy A $1.20", 14px / 600. Default = `orderDefaults.lastToothType` (as now).
  This replaces `TypePrices` in the header.
- **Chart card** — margin `14px 8px 0`, radius 18, background `#FBF8F0`, padding `16px 8px 18px`.
  `touch-action: none; user-select: none`. **Keep the existing geometry exactly** (36×48 cell,
  34×42 tooth, 6px gutter, 12px parabolic dip, `CHART_ROWS` order, entry stagger). Changes:
  - Tooth radius 11px, **no border**. Unselected fill `rgba(20,18,15,0.06)`, number `#8A8175`
    12px / 600. Selected fill `--frasaco` / `--copy-a` (or the existing 135° split gradient for both),
    number `#FFFFFF`.
  - Unselected teeth sit at `scale(0.92)`; selecting animates to `scale(1)` on
    `--ease-spring-pop` 380ms (compose with the dip translate — keep the `.tooth-cell` pattern).
  - Quantity badge: 18px min, radius 999, `#14120F` bg, white 10px text, **2px `#FBF8F0` border**,
    offset −5px top/right. Shown when quantity > 1.
  - Between upper and lower arch: a 30px gap (no midline label; the lower arch's dip needs the room).
- **Interaction — UNCHANGED from today (owner decision):**
  - **Tapping any tooth opens the tooth sheet**, exactly as `openSheet` does now. No one-tap add,
    no drag-to-add.
  - For a tooth not yet in the order, the sheet preselects **1 of the type chosen in the segmented
    control** (instead of always `lastToothType`; the control itself defaults to `lastToothType`).
  - Existing teeth open with their current quantities, as now.
- Hint under the chart: "Tap a tooth to choose type and quantity" 13px `#8A8175`, centred.
- **Extras** — section header "ALSO FROM <SELLER FIRST NAME>" (style as Market section header,
  margin `22px 20px 6px`), then an inset grouped list (radius 14, margin `0 16px`). Row padding
  `10px 14px`, separator 0.5px. Name 16px; meta "<brand> · $<price> · <unit>" 13px `#8A8175`.
  **Pill stepper**: height 32, radius 999, bg `rgba(20,18,15,0.07)`, − and + buttons 38×32 (extend the
  hit area to 44 with padding/pseudo), count 15px / 600, `#8A8175` at 0. Tapping the row text still
  opens the product sheet. Category chips (> 8 products) become capsule chips, height 32, radius 999.
- **Undo toast** (replaces the undo bar) — centred above the floating bar (bottom ≈ 104px),
  height 36, radius 999, bg `rgba(20,18,15,0.86)`, text `#FBF8F0` 14px, padding `0 6px 0 14px`,
  gap 12, `white-space: nowrap`. Button "Undo": height 28, radius 999, bg `rgba(251,248,240,0.16)`,
  14px / 600. Messages: "Added tooth 16", "Updated tooth 16", "Removed tooth 16" (same as today).
  Timeout 5s (was 7s — keep 7s if you prefer; owner has no strong view).
- **Floating total bar** (replaces the pinned footer) — absolute/fixed, `left: 12px; right: 12px;
  bottom: 26px` (+ safe-area), radius 24, padding `8px 8px 8px 18px`, bg `rgba(251,248,240,0.76)`,
  `backdrop-filter: blur(24px) saturate(180%)`, border `0.5px solid rgba(20,18,15,0.10)`,
  shadow `0 8px 28px rgba(20,18,15,0.16), inset 0 0.5px 0 rgba(255,255,255,0.7)`.
  Left: total 22px / 700 / −0.01em tabular (keep `useCountingMoney`), below it
  `describeLines()` 13px `#5E574C` or "Nothing yet". Right: **Review** — height 48, radius 18,
  bg `#14120F`, text `#FBF8F0` 17px / 600, padding `0 24px`, press scale 0.95, opacity 0.3 when empty.
  Editing with everything removed → this button becomes "Cancel this order" (existing behaviour).

### 3. Sheets (tooth, product, review)

Restyle `BottomSheet` only — **keep all its physics** (drag from header, momentum projection,
rubber-band, velocity hand-off, haptic on thrown landing, reduced-motion path).

- Panel: **inset** `left: 8px; right: 8px; bottom: 8px` (+ safe-area), radius 32 on all corners,
  bg `#FBF8F0`, padding-bottom 20, shadow `0 10px 40px rgba(20,18,15,0.22)`.
- Scrim `rgba(20,18,15,0.32)` (was 0.45).
- Grabber 36×5, radius 999, `rgba(20,18,15,0.20)`, margin-bottom 14. Header padding `8px 22px 6px`.
- Title 22px / 700 / −0.01em; subtitle 15px `#8A8175`.
- Inset group inside a sheet: margin `10px 16px 0`, radius 16, bg `rgba(20,18,15,0.05)`.
- Primary button: height 50, radius 16, `#14120F`, 17px / 600. Secondary: same, bg
  `rgba(20,18,15,0.07)`, text `#14120F`.

**Tooth sheet** — title "Tooth 16", subtitle from `TOOTH_NAMES`. Inset group with two rows
(Frasaco / Copy A): 10px dot, label 17px + price 15px `#8A8175`, pill stepper (height 36, bg `#FBF8F0`,
buttons 44×36, count 17px / 600). Buttons row (gap 8, padding `16px 16px 0`): secondary "Remove"
(auto width, padding `0 18px`) + primary "<Add|Update> · $<position subtotal>" (flex 1).
At 0 quantity the primary reads "Remove".

**Product sheet** — same shell; description, facts list as an inset group; pill stepper; primary "Done".

**Review sheet** — title "Review" (or "Review changes" when editing), subtitle
"<seller> · pay at pickup". Lines in an inset group (padding `4px 14px`, max-height ≈ 230px, scrolls):
8px dot, "Tooth 16" 16px + type 14px `#8A8175`, "×2" 14px `#8A8175`, line total 16px / 600 tabular.
Extras lines without a dot. Below: row "Total · locked when placed" 15px `#8A8175` + total 28px / 700 /
−0.02em tabular, padding `14px 22px 0`. Keep the price-changed / gone / error notices, restyled as
inset groups (radius 16) — content and logic unchanged.

**Hold to place** — one full-width button, height 56, radius 18, bg `#14120F`, text 17px / 600.
Label "Hold to place · $<total>". On `pointerdown`: label → "Keep holding…", a fill layer
(bg `--fulfilled`, `transform-origin: left`) animates `scaleX(0 → 1)` linear over **1000ms**;
on completion → `haptic()` + call the existing `handleConfirm`. `pointerup` / `pointerleave` /
`pointercancel` before 1000ms → cancel; fill returns to 0 over 220ms `--ease-out`.
While the server action is pending: label "Placing…", button disabled.
**Accessibility fallback (required):** keyboard Enter/Space and screen-reader activation place the order
immediately (no hold), and with `prefers-reduced-motion` the fill is replaced by an opacity change.
Editing mode: label "Hold to save changes".

### 4. Placed screen (`confirmed/[orderId]`)

Centred column, padding `70px 20px 32px`, gap 14.
- 84px circle `#14120F` with a white check (stroke 2.6). Keep the existing `tick-in` animation.
- Title "Sent to <seller first name>" 28px / 700 / −0.02em.
- "<describeLines> · $<total> at pickup" 17px `#5E574C`.
- Status card: radius 20, bg `#FBF8F0`, padding 16, gap 12, text-left. Row: "Waiting for <first name>"
  15px / 600 + "just now" `#8A8175`. Progress: three segments, height 5, radius 999, gap 4 —
  filled `#14120F`, empty `rgba(20,18,15,0.12)`. Labels below 12px `#8A8175`:
  Placed · Confirmed · Handed over. (Placed = 1 filled; this screen only ever shows 1.)
- Bottom: "Done" — full width, height 50, radius 14, bg `rgba(20,18,15,0.07)`, 17px / 600 → `/student`.
  Keep any existing "Edit order" link, styled as secondary.

## State

No new server state. Client state added in `OrderBuilder`: hold-to-place progress. `selectedType` already exists implicitly via
`initialToothType` — lift it to state, driven by the segmented control.
Reorder needs the student's last order (seller id, lines) — reuse whatever "Order again"
(`reorder-button.tsx`) already reads; no new query if it can be avoided. Say so if one is needed.

## Design tokens

See `CLAUDE.md-design-system.md` — that file is the source of truth for colours, type, radii, blur,
shadows and motion.

## Assets

No new assets. Icons are the existing inline SVGs from `_components/icons.tsx` and the nav; the active
tab icon becomes a filled variant of the same path.

## Files in this folder

- `README.md` — this spec.
- `CLAUDE.md-design-system.md` — replacement design section for `CLAUDE.md` (Step 0).
- `reference/Molaro Explorations.dc.html` + `reference/support.js` — interactive prototype; option **1c**
  is the target.

## Prompt to paste into Claude Code

> Read `design_handoff_ios_feel/README.md` in full. This is an approved owner decision that overrides the
> design rules in CLAUDE.md. Do Step 0 now (replace the CLAUDE.md design section verbatim, commit), then
> Step 1. Stop after Step 1 and report what changed in plain language.
