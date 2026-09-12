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

```css
--bg:         #0e0e11;
--surface:    #16161a;
--border:     rgba(255,255,255,0.08);
--text:       #f0f0f0;
--text-muted: #6b6b7a;
--accent:     #c8f04a;   /* primary — lime */
--accent2:    #7b61ff;
--frasaco:    #c8f04a;
--copy-a:     #61d0ff;
--supplier:   #639922;
--warning:    #ef9f27;
```

- Headings: **Syne** (600–800). Body: **DM Sans** (300–500).
- Radius: 16px cards, 10px small elements.
- Dark theme is the default and the primary. Do not add light mode.
- Mobile-first. Every screen must work at 375px width. Tap targets minimum 44×44px.
- Restrained micro-animation on tooth selection, order confirmation, route transitions. Respect `prefers-reduced-motion`.
- Every list and empty view gets a designed empty state. No blank screens.

When a screen exists in `/reference`, match it. Do not redesign it.

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

---

## Domain notes

- **FDI tooth numbering**, 32 teeth: 11–18, 21–28, 31–38, 41–48. Four quadrants of eight. Quadrant 1 is upper right, 2 upper left, 3 lower left, 4 lower right — from the patient's perspective.
- **Frasaco** is the genuine brand tooth (~$2.50). **Copy A** is the cheaper copy (~$1.20). Reps set their own prices.
- Students order **weekly**, weeks 1–17 of the academic semester.
- 286 orders in one semester from a single group. Only 4 of them mixed both tooth types — default the type selector to the student's last used type.
- **Reps** handle teeth. **Suppliers** handle store products. They never see each other's orders.
- The platform takes **no cut on tooth orders** and a **commission on store orders**. The student never sees a commission figure anywhere.
