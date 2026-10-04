# Design goal — make Dentora feel like a real app

Set by the owner on 3 Oct 2026. Work through it **one step at a time, in order**.
After each step: build, tsc, tests, walk it at 375px on real data, push, report, stop.
CLAUDE.md still rules: paper design system, no dark mode, rem units, SQL before code,
no product images, no shop browse page, no carts across sellers, no commission.

## What the audit found (screens as they are today)

1. **Settings and Profile push a form in your face.** Every other app opens on a
   menu: who you are at the top, grouped rows with chevrons, each row opens its
   own screen, sign out at the bottom.
2. **Products are one line each.** Name, category, price, unit. Nothing a student
   can use to tell two gloves apart: no description, brand, size or pack details.
3. **The seller's order card has four equal buttons.** "Mark handed over" wraps to
   three lines. A pending order offers handing over before confirming. There
   should be one obvious next step and the rest tucked away.
4. **The student's order card scatters its actions.** Edit, Order again and
   Cancel order sit in three places with three styles. "Order again" shows on
   an order that hasn't even been confirmed yet.
5. **The market says "F $2.50 / C $1.20".** Students have to decode it.
6. **Extras is a long flat list under the chart.** Fine with three products;
   unusable with thirty. Nothing opens to show more about a product.

## The steps

### Step 1 — Settings as a menu (both roles) — SHIPPED 3 Oct 2026
- Student "Profile" tab and seller "Settings" tab become one pattern: a header
  card (name, university, year), then grouped rows:
  - **Account**: Personal details › · Email (shown) · Change password ›
  - **Selling** (sellers only): How you appear in the market › (read-only)
  - **Help**: Contact Dentora › · About Dentora (version)
  - **Sign out** on its own row at the bottom.
- Personal details opens its own screen with the form we have now.
- Change password: new screen, server action, current session required.
  This also fixes "Mahmoud forgot his password" for the future: add
  "Forgot password?" on sign-in. **Needs custom SMTP first**; until then it
  shows "Message Riad". Flag before building.
- No SQL.

### Step 2 — Product detail for sellers — SHIPPED 4 Oct 2026 (not yet walked on real data)
- New fields: **description** (up to 300 characters), **brand** (optional),
  **pack size / unit** (already there). Each with a clear label and hint.
- Add/edit opens as its own screen instead of an inline form.
- **SQL first** (new columns, length checks, snapshot of brand on order lines),
  rehearsed on the test project, owner runs it on production.
- **Owner decision needed:** sizes (gloves S / M / L, bur grit). Either each
  size is its own product (no change, works today) or one product carries
  options (a real schema change touching price snapshotting). Default: each
  size its own product, until told otherwise.

### Step 3 — Product detail for students — SHIPPED 4 Oct 2026
- Tapping an extra opens a bottom sheet: name, brand, description, pack size,
  price, the quantity stepper. The list itself stays compact.
- Category chips above the list once a seller has more than eight products.

### Step 4 — One next step per order card — SHIPPED 4 Oct 2026
- Seller: one primary button for the next status (Confirm → Mark handed over),
  "Mark paid" as a secondary toggle, Reject and the rest under a "More" menu.
- Student: pending shows Edit + Cancel together; "Order again" only on
  finished orders.

### Step 5 — Market and small polish
- Market rows say "Frasaco $2.50 · Copy A $1.20" with the type colours.
- Seller's product count on each market row ("+ 12 extras").
- Consistent screen headers and back buttons on every pushed screen.

## Done means
All five steps shipped, each verified on real data at 375px, and the owner has
used Settings and Products on his own phone and said yes.
