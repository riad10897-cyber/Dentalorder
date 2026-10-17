# DentalOrder — Working Rules

You are building DentalOrder, a mobile-first web app for dental students in Lebanon.
Its public name is **Molaro** (renamed from Dentora, Oct 2026). Use "Molaro" in every user-facing string; "DentalOrder" stays only in code and file names.
The full specification is `DentalOrder_Build_Spec_v3.md` in this repo. **Read it before writing any code.**
Visual mockups are in `/reference`. They are the design source of truth.

The product owner has no coding background. Explain decisions in plain language. Never assume he can debug anything himself.

---

## Stack — already decided, do not substitute

| Layer | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript strict |
| Styling | Tailwind CSS v4 |
| Backend / DB / Auth / Storage | Supabase |
| Validation | Zod, on every server action input |
| Animation | Motion (`motion/react`) |
| Hosting | Vercel |

Do not introduce a new dependency without saying what it is for and why nothing already installed does the job.

---

## Non-negotiable rules

1. **No client-side database writes.** Every mutation goes through a server action that re-checks authorisation.
2. **RLS on every table.** No table ships with Row Level Security disabled.
3. **`SUPABASE_SERVICE_ROLE_KEY` is server-only.** Never import it into a `"use client"` file. Never expose it in a response.
4. **Money is `numeric(10,2)`.** Never a float. Currency is USD everywhere.
5. **Prices are snapshotted at order time.** A price change must never alter a past order's total.
6. **Totals are computed server-side at insert.** No route or role may edit `unit_price`, `line_total`, `subtotal`, `commission_amount`, or `total_price` on an existing order.
   One owner-approved exception (17 Oct 2026): a seller may take unavailable lines off a pending or confirmed order through `remove_unavailable_lines`. It never edits in place: the remaining lines are copied, at their original prices, onto a replacement order whose total the database computes at insert; the original stays untouched and is cancelled. No price or amount is ever read from the request.
7. **Never commit `.env.local`** or any key, in any file, ever.

---

## Auth notes

- **Admin accounts are never created through the public sign-up form.** There is no "Admin" option in the sign-up UI, and the server action rejects `role: "admin"` outright. Admins are set manually in the database — see the SQL Editor steps sent along with each auth-related change.
- **Email confirmation is currently OFF** in Supabase Auth (Providers → Email) to make testing possible without inbox access. Supabase's default email sender is rate-limited and not meant for real users. **Before turning email confirmation back on, set up a custom SMTP provider** (Project Settings → Auth → SMTP Settings) — otherwise confirmation emails will be slow, land in spam, or simply fail to send once past a handful of sign-ups.

---

## Phase discipline — the most important rule here

The spec has five phases in §13. **Build one phase, stop, and report.**

Do not start the next phase without being told to. Phase 2 ends with real students using tooth ordering — that gate is deliberate and commercial, not technical.

**Store gate — lifted for one slice only.** The owner has opened the store gate for "Extras from your seller": a seller lists a few products, and a student adds them to the weekly order they are already placing with that seller. One seller, one order, one pickup, one payment. That slice and nothing past it. The rest of the spec's Phase 3 Store stays gated — no carts across sellers, no shop browse page, no product images, no commission. Do not build any of it without being told to.

At the end of every phase, state:
- what was built
- what was deliberately left out
- anything in the spec that turned out wrong or ambiguous
- exactly what the owner needs to do (run a migration, add an env var, click something in Supabase)

---

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
  Newsreader and Atkinson Hyperlegible are retired everywhere: student,
  seller and sign-in screens all use "Paper, native".
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

---

## Working style

- Read before you write. Check for an existing component or helper before creating one.
- Small, focused commits with clear messages. Commit at the end of each meaningful unit of work.
- Never `git push --force`. Never rewrite history.
- Run `npm run build` and `npx tsc --noEmit` before declaring anything finished. A phase is not done if the build fails.
- No `any` in application code. No `@ts-ignore` without a comment explaining why.
- Do not write tests for everything, but **do** write a test for anything money-related: total calculation, commission calculation, price snapshotting.
- If the spec is ambiguous, pick the sensible default, build it, and flag it. Do not stall waiting for an answer.
- If the spec is **wrong** — contradicts itself or won't work — stop and say so before building it.

## Verify the security rules, don't just write them

Before finishing any phase that adds a table, prove the RLS policies work:

- A rep cannot read another rep's orders through the API
- A supplier cannot read tooth orders
- A student cannot read another student's orders
- A crafted request cannot change a price or total on an existing order

Test these against the running database, not by reading the policy file.

**Assert the outcome, not the status code.** A test that checks for 403 when
the server answers 401 reports a closed hole as open, or an open one as
closed. Check what actually happened: the persisted value, the error code,
whether the row exists. Three false signals in one week all came from this.

---

## Domain notes

- **FDI tooth numbering**, 32 teeth: 11–18, 21–28, 31–38, 41–48. Four quadrants of eight. Quadrant 1 is upper right, 2 upper left, 3 lower left, 4 lower right — from the patient's perspective.
- **Frasaco** is the genuine brand tooth (~$2.50). **Copy A** is the cheaper copy (~$1.20). Reps set their own prices.
- Students order **weekly**, weeks 1–17 of the academic semester.
- **A week's number is the week the teeth are for.** Sellers are students
  too: during week 4 they take orders for week 5, and a "week 5" order is
  handed over in week 5. The seller's week card reads "Taking orders for
  week 5". Students never see week numbers.
- 286 orders in one semester from a single group. Only 4 of them mixed both tooth types — default the type selector to the student's last used type.
- There are no reps. A **seller** (a row in `suppliers`) sells teeth and, since "Extras from your seller", a few products. A student picks a seller per order. Sellers never see each other's orders, nor each other's products beyond what any student sees.
- A weekly order is `order_type = 'tooth'` even when it carries extras: "tooth" means "a weekly order from a seller". One order, one seller.
- Product categories are a fixed list of five: Burs, Instruments, Materials, Gloves & masks, Equipment. Only an admin can change them.
- The platform takes **no cut** — not on teeth, not on extras. Commission stays 0. The student never sees a commission figure anywhere.
