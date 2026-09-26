# DentalOrder — Working Rules

You are building DentalOrder, a mobile-first web app for dental students in Lebanon.
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
7. **Never commit `.env.local`** or any key, in any file, ever.

---

## Auth notes

- **Admin accounts are never created through the public sign-up form.** There is no "Admin" option in the sign-up UI, and the server action rejects `role: "admin"` outright. Admins are set manually in the database — see the SQL Editor steps sent along with each auth-related change.
- **Email confirmation is currently OFF** in Supabase Auth (Providers → Email) to make testing possible without inbox access. Supabase's default email sender is rate-limited and not meant for real users. **Before turning email confirmation back on, set up a custom SMTP provider** (Project Settings → Auth → SMTP Settings) — otherwise confirmation emails will be slow, land in spam, or simply fail to send once past a handful of sign-ups.

---

## Phase discipline — the most important rule here

The spec has five phases in §13. **Build one phase, stop, and report.**

Do not start the next phase without being told to. Phase 2 ends with real students using tooth ordering — that gate is deliberate and commercial, not technical.

At the end of every phase, state:
- what was built
- what was deliberately left out
- anything in the spec that turned out wrong or ambiguous
- exactly what the owner needs to do (run a migration, add an env var, click something in Supabase)

---

## Design system

Printed paper, not a dark app. This replaced the original dark lime theme
outright — `#0e0e11` and `#c8f04a` are gone and must not come back.

```css
--paper:      #F2EDE1;   /* page background */
--card:       #FBF8F0;   /* surfaces */
--card-sunk:  #EFE8D9;   /* wells, tracks, inset areas */
--ink:        #14120F;   /* primary text, primary buttons */
--ink-muted:  #5E574C;   /* secondary text */
--ink-faint:  #8A8175;   /* labels, disabled, tooth numbers */
--rule:       rgba(20,18,15,0.16);   /* borders */
--hairline:   rgba(20,18,15,0.09);   /* internal dividers */
--frasaco:    #C0362C;   /* Frasaco, and only Frasaco */
--copy-a:     #3F5F6E;   /* Copy A, and only Copy A */
--fulfilled:  #4A6B41;   /* fulfilled status, nothing else */
```

- **Light only. Do not build a dark mode.**
- Each colour has one job. Never borrow `--frasaco` for a generic error or
  `--fulfilled` for a generic success — a red that means "Frasaco" cannot
  also mean "something went wrong".
- Display: **Newsreader** (400/500/600) with `font-optical-sizing: auto` —
  headings, numbers, money, button labels. Body: **Atkinson Hyperlegible**
  (400/700).
- Tracking is size-specific, never one global value; it is baked into the
  `--text-*` scale in `globals.css`. Leading is tight on large text (~1.1),
  loose on body (~1.5).
- **Every font size in `rem`, every spacing value in `rem`/`em`.** Fixed
  `px` makes the phone's text-size setting do nothing.
- `tabular-nums` (the `.tnum` class) on every money figure, quantity and
  count, or the running total jitters as digit widths change.
- Radius: 4px controls and tags, 6px cards. Hairline rules, not shadows.
  The only shadow in the app is the tooth sheet's.
- Mobile-first. Every screen must work at 375px width. Tap targets minimum
  44×44px.
- Every list and empty view gets a designed empty state. No blank screens.

### Motion

Curves live in `globals.css` as `--ease-out`, `--ease-in-out` and
`--ease-drawer`. Use those exact values; never `ease-in` on a UI element,
never `transition: all`, never `scale(0)`, never animate width/height/
margin/padding/top/left, never keyframes on anything triggerable twice a
second.

- Frequently-seen screens get **no entrance choreography**, and nothing
  keyboard-initiated animates at all.
- Press feedback (`.pressable`, `scale(0.97)` at 120ms) belongs on every
  pressable element, and fires on pointer-down rather than release.
- `prefers-reduced-motion`, `prefers-reduced-transparency`,
  `prefers-contrast` and `(hover: hover)` gates ship with the motion, not
  after it. Reduced motion means gentler, not none: keep opacity and
  colour, drop movement.

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
- 286 orders in one semester from a single group. Only 4 of them mixed both tooth types — default the type selector to the student's last used type.
- **Reps** handle teeth. **Suppliers** handle store products. They never see each other's orders.
- The platform takes **no cut on tooth orders** and a **commission on store orders**. The student never sees a commission figure anywhere.
