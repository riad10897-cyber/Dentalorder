# DentalOrder — Build Specification v3.0

**Audience:** an AI coding agent (Claude Code) building this application end to end.
**Supersedes:** Dev Spec v1.0 and v2.0.
**Location:** Lebanon. **Owner:** Riad Jawhar (non-technical product owner).
**Status:** greenfield. No existing codebase.

---

## 0. What changed from v2.0 — read this first

v2.0 described a tooth-ordering app only. v3.0 adds the marketplace. Four corrections carry forward:

| # | v2.0 said | v3.0 says |
|---|-----------|-----------|
| 1 | Three roles (Student, Rep, Admin) | **Four roles** — Supplier added |
| 2 | Orders hold teeth only | **Two order types** — `tooth` and `store`, on a shared order spine |
| 3 | "The platform does not take a cut of per-order revenue" | **Correct for tooth orders. Wrong for store orders** — the platform takes commission on store orders. See §7 |
| 4 | No AI layer | **Denta** — an onboarding/recommendation layer, scoped in §9 |

Anything in v2.0 not contradicted here still applies.

---

## 1. What the product is

Dental students in Lebanon buy two different things:

1. **Plastic practice teeth**, weekly, through their class representative. Today this runs on a 146-question Google Form. This is the habit-forming loop — 286 orders in one semester from a single group.
2. **General dental supplies** — gloves, burs, impression material, instruments — today bought ad hoc from local suppliers with no digital channel.

DentalOrder does both. Teeth ordering earns the weekly open. The store monetises that attention.

**The two loops are deliberately different:**

- **Tooth orders** route to a **Representative**, who buys stock and hands it over in person. Platform takes no cut. Reps pay a subscription.
- **Store orders** route to a **Supplier**, who fulfils and delivers directly. Platform takes a commission. Reps are not involved.

Do not merge these flows in the UI. Do not fork the schema for them.

### Real usage data (Semester 5, one rep group)

| Metric | Value |
|---|---|
| Total orders | 286 in one semester |
| Frequency | Weekly, every week of the cycle |
| Peak weeks | 2, 7, 9, 10, 13 |
| Mixed-type orders | 4 of 286 — students almost always order one tooth type per week |
| Average order value | ~$8–12 per student per week |

**Design implication:** default the tooth-type selector to the student's last used type. Mixing types is a 1.4% case — support it, don't optimise for it.

---

## 2. Stack — not optional

Chosen so one agent can build, migrate, and deploy the whole thing.

| Layer | Choice |
|---|---|
| Framework | **Next.js 15**, App Router, TypeScript strict |
| Styling | **Tailwind CSS v4** |
| Backend + DB + Auth | **Supabase** (Postgres, Auth, Row Level Security, Storage) |
| Data access | Supabase JS client; **server actions** for all writes |
| Validation | **Zod** on every server action input |
| Animation | **Motion** (`motion/react`) |
| Hosting | **Vercel** |
| PWA | `manifest.json` + service worker. Installable, works on a weak 4G connection |

**Web first, deliberately.** No native app in any phase of this spec. A PWA validates demand, ships daily, and needs no app store review. Native is a decision for after the product has proven weekly retention, not before.

**Hard rules**

- No client-side database writes. Every mutation goes through a server action that re-checks authorisation.
- RLS enabled on every table. No table ships with RLS off.
- No secrets in client components. `SUPABASE_SERVICE_ROLE_KEY` is server-only and never imported into a `"use client"` file.
- All money is `numeric(10,2)`. Never float.
- All money is **USD**. Lebanon prices in USD in practice. No multi-currency in v1.

---

## 3. Roles

### 3.1 Student — free
- Places weekly tooth orders through the visual chart
- Browses and orders from the store
- Sees totals before submitting, in both flows
- Views order history across both types; one-tap reorder
- Selects their representative at signup

### 3.2 Representative (Delegate) — pays subscription
- Receives and manages tooth orders from their assigned students
- Sets their own per-tooth prices (Frasaco, Copy A)
- Marks orders confirmed / fulfilled / paid
- Views weekly batching summary and per-student history
- **Has no access to store orders.** The store is not theirs.

### 3.3 Supplier — pays commission
- Lists products in the store: name, description, category, price, stock, image
- Receives store orders, marks them confirmed / shipped / delivered
- Views their own commission statement per month
- **Sees only their own products and orders.** Never another supplier's. Never tooth orders.

### 3.4 Super Admin (Riad)
- Full read across every rep, supplier, student, and order
- Onboards and suspends reps and suppliers
- Sets the commission rate per supplier
- Generates monthly commission statements
- Platform-wide metrics

---

## 4. Data model

Complete schema. Generate as a Supabase migration.

```sql
-- ─────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────
create type user_role        as enum ('student','rep','supplier','admin');
create type order_type       as enum ('tooth','store');
create type payment_status   as enum ('unpaid','pending','paid');
create type fulfillment_status as enum ('pending','confirmed','fulfilled','cancelled');
create type tooth_type       as enum ('frasaco','copy_a');
create type account_status   as enum ('active','suspended','pending_approval');

-- ─────────────────────────────────────────────
-- PROFILES  (1:1 with auth.users)
-- ─────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  role          user_role not null default 'student',
  full_name     text not null,
  phone         text,
  university    text,          -- 'BAU' | 'LU' | 'USJ' | other
  year_of_study smallint,      -- 1..5
  section       text,
  status        account_status not null default 'active',
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- REPRESENTATIVES
-- ─────────────────────────────────────────────
create table representatives (
  id                uuid primary key references profiles(id) on delete cascade,
  display_name      text not null,
  university        text not null,
  year_of_study     smallint,
  section           text,
  frasaco_price     numeric(10,2) not null default 2.50,
  copy_a_price      numeric(10,2) not null default 1.20,
  whish_number      text,
  subscription_paid_until date,
  price_updated_at  timestamptz default now(),
  created_at        timestamptz not null default now()
);

-- student → rep assignment
create table student_reps (
  student_id uuid primary key references profiles(id) on delete cascade,
  rep_id     uuid not null references representatives(id) on delete restrict,
  assigned_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- SUPPLIERS
-- ─────────────────────────────────────────────
create table suppliers (
  id               uuid primary key references profiles(id) on delete cascade,
  business_name    text not null,
  contact_phone    text not null,
  contact_email    text,
  logo_url         text,
  description      text,
  commission_rate  numeric(5,2) not null default 10.00,  -- percent, admin-set
  delivery_notes   text,       -- shown to student at checkout
  status           account_status not null default 'pending_approval',
  created_at       timestamptz not null default now()
);

create table product_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  sort_order smallint not null default 0
);

create table products (
  id           uuid primary key default gen_random_uuid(),
  supplier_id  uuid not null references suppliers(id) on delete cascade,
  category_id  uuid references product_categories(id) on delete set null,
  name         text not null,
  description  text,
  image_url    text,
  price        numeric(10,2) not null check (price >= 0),
  unit         text,                    -- 'box of 100', 'each', 'pack'
  stock_qty    integer,                 -- null = untracked
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on products (supplier_id);
create index on products (category_id) where is_active;

-- ─────────────────────────────────────────────
-- ORDERS — one spine, two types
-- ─────────────────────────────────────────────
create table orders (
  id                 uuid primary key default gen_random_uuid(),
  order_type         order_type not null,
  student_id         uuid not null references profiles(id) on delete restrict,

  rep_id             uuid references representatives(id) on delete restrict, -- tooth only
  supplier_id        uuid references suppliers(id) on delete restrict,       -- store only

  week_number        smallint check (week_number between 1 and 17),          -- tooth only

  subtotal           numeric(10,2) not null default 0,
  commission_rate    numeric(5,2)  not null default 0,   -- snapshot, store only
  commission_amount  numeric(10,2) not null default 0,   -- snapshot, store only
  total_price        numeric(10,2) not null default 0,

  payment_status     payment_status not null default 'unpaid',
  fulfillment_status fulfillment_status not null default 'pending',
  delivery_address   text,                               -- store only
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- a tooth order has a rep and a week; a store order has a supplier
  constraint order_shape check (
    (order_type = 'tooth' and rep_id is not null and supplier_id is null and week_number is not null)
    or
    (order_type = 'store' and supplier_id is not null and rep_id is null)
  )
);
create index on orders (student_id, created_at desc);
create index on orders (rep_id) where order_type = 'tooth';
create index on orders (supplier_id) where order_type = 'store';

create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,

  -- tooth line
  tooth_number smallint check (
    tooth_number between 11 and 18 or tooth_number between 21 and 28 or
    tooth_number between 31 and 38 or tooth_number between 41 and 48
  ),
  tooth_type   tooth_type,

  -- store line
  product_id   uuid references products(id) on delete restrict,
  product_name text,          -- snapshot; product may later be renamed or deleted

  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10,2) not null check (unit_price >= 0),  -- price snapshot
  line_total   numeric(10,2) not null,

  constraint item_shape check (
    (tooth_number is not null and tooth_type is not null and product_id is null)
    or
    (product_id is not null and tooth_number is null and tooth_type is null)
  )
);
create index on order_items (order_id);

-- ─────────────────────────────────────────────
-- COMMISSION STATEMENTS
-- ─────────────────────────────────────────────
create table commission_statements (
  id             uuid primary key default gen_random_uuid(),
  supplier_id    uuid not null references suppliers(id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  order_count    integer not null default 0,
  gross_sales    numeric(10,2) not null default 0,
  commission_due numeric(10,2) not null default 0,
  is_settled     boolean not null default false,
  settled_at     timestamptz,
  created_at     timestamptz not null default now(),
  unique (supplier_id, period_start, period_end)
);
```

**Non-negotiable data rules**

1. **Snapshot every price.** `unit_price`, `commission_rate`, `commission_amount` and `product_name` are frozen at order time. A rep raising Frasaco to $3.00 must never alter a past order's total.
2. **Commission is on store orders only.** A tooth order always has `commission_rate = 0` and `commission_amount = 0`.
3. **One supplier per store order.** A cart spanning two suppliers splits into two orders at checkout. Show this clearly to the student — two suppliers means two deliveries.
4. `total_price` = `subtotal` for both types. Commission is deducted from the supplier's side, not added to the student's. **The student never sees the commission.**

---

## 5. Tooth ordering flow (Student)

The centrepiece. Under 30 seconds, start to submit.

1. **New Order** — one tap from home.
2. **Week selector** — 1 to 17. Default to the current academic week if derivable, otherwise the last used week + 1.
3. **Visual dental chart** — an interactive SVG of all 32 teeth in FDI numbering, four quadrants of eight. Tap a tooth → a bottom sheet opens with tooth type and quantity. Selected teeth stay highlighted on the chart. Multiple teeth per order.
   - Default the tooth type to the student's last used type.
   - Running total pinned and updating live as teeth are added.
   - Chart must be usable with a thumb on a 375px-wide screen. Tap targets minimum 44×44px.
4. **Review & submit** — every line with type, quantity, line total, order total. Confirm.
5. **Confirmation** — a polished animated moment. This is the screen that makes students tell other students.

**Treat the confirmation screen as the growth surface.** Reps recruit students, and a student who just finished a weekly order in twenty seconds is the most persuasive thing the product has. Show the elapsed time or the tooth count as a small, shareable summary card, and give it a share action that opens the native share sheet with a prefilled line and a link to the app. No screenshot interception, no gimmicks. One button on the screen students already reach every week.

Reorder: one tap from any past order, prefilled, week bumped to current.

**Rep routing.** v1 uses manual selection — the student browses available reps at signup and picks their own. Students generally know their rep personally, so this covers nearly every real case. Automatic matching on university / year / section is Phase 2; the fields needed for it are already on `profiles` and `representatives`.

---

## 6. Store flow (Student)

1. **Store tab** — categories, featured products, search.
2. **Product detail** — image, description, price, unit, supplier name, stock state.
3. **Cart** — grouped by supplier, with a clear note when an order will split.
4. **Checkout** — delivery address, phone, order notes. Total shown. Offline payment for v1 (see §8).
5. **Confirmation** — order sent to the supplier; delivery handled by the supplier directly.

**Out of scope for v1:** returns, refunds, in-app disputes, ratings. If a student has a problem they contact the supplier. State this in the terms text at checkout.

---

## 7. Revenue model

Three streams. Build all three surfaces; only the first two are live at launch.

### 7.1 Rep subscription
- Flat annual fee per rep, **$25–40/year**, set by the admin per rep
- Precedent: reps already paid $25/year for the Google Form
- Collected **offline**. No in-app subscription billing in v1.
- Stored as `representatives.subscription_paid_until`. Expired reps are read-only until the admin renews them.

### 7.2 Marketplace commission
- Percentage of store order value, **default 10%**, per-supplier, admin-set
- Snapshotted onto every store order at checkout
- Invoiced monthly to the supplier from a generated statement
- Collected offline (bank transfer)
- Supplier sees: orders, gross sales, commission due, settled or not

### 7.3 Featured listings — Phase 2, build nothing yet
Paid placement once there are 5+ active suppliers. Leave a `sort_order` hook on products; do not build a billing surface.

---

## 8. Payments

Stripe and PayPal are unavailable in Lebanon. Three options, in order of complexity.

| Option | Method | Phase |
|---|---|---|
| A | Offline — cash or bank transfer, app displays total only | **v1** |
| B | Whish payment link generated per order | Phase 1.5 |
| C | Whish Pay merchant integration | Phase 2 |

**Build Option A.** The app calculates and displays totals; money moves outside the app. Reps mark tooth orders paid; suppliers mark store orders paid. No merchant account, no legal entity, no payment gateway in v1.

Structure the payment status field so B slots in without a schema change.

---

## 9. Denta — AI layer (Phase 1.5, scaffold only in v1)

In v1 build **the profile capture only**, no model calls:

- At signup, ask three things: university, year of study, and which lab courses they are taking this semester
- Store on `profiles`; add a `student_preferences` table if the course list needs to be structured
- Use it for non-AI personalisation immediately: default tooth type, relevant store categories first, week defaults

**Use the captured data on the very next screen, not later.** Profile data that only sits in a table is wasted onboarding. Every field collected must visibly change the first session: the tooth type comes preselected, the week is already right, the store opens on categories that match their year. If a question does not change something the student sees, cut the question.

**Keep onboarding short.** Three questions, maximum. Longer onboarding flows work for entertainment products where the questions are the experience. This is a utility, and every screen before the dental chart loses students.

Do not integrate an LLM in v1. Do not build a chat interface. The recommendation engine is Phase 1.5 and the captured profile is what it will run on.

---

## 10. Dashboards

### 10.1 Rep dashboard
- Incoming tooth orders, newest first
- Order detail: per-tooth breakdown, quantities, line totals
- **Weekly batching summary** — total Frasaco and total Copy A for the week, so the rep can place one supplier order. This is the rep's single most valuable screen.
- Student list with per-student history
- Pricing settings — Frasaco and Copy A, editable, affecting future orders only
- Status controls: confirmed / fulfilled, and mark as paid

### 10.2 Supplier dashboard
- Incoming store orders, newest first
- Order detail: products, quantities, delivery address, student phone
- Status controls: confirmed / shipped / delivered, and mark as paid
- Product management: create, edit, deactivate, image upload to Supabase Storage
- Commission statement per month: orders, gross sales, commission due, settled state

### 10.3 Admin dashboard
- All reps: status, student count, order volume, subscription expiry
- All suppliers: status, product count, order volume, commission rate, amount owed
- Approve or suspend reps and suppliers
- Set commission rate per supplier
- Generate monthly commission statements
- Platform metrics: orders by type, GMV, active students, week-over-week

---

## 11. Auth & authorisation

| Role | Login |
|---|---|
| Student | Email + password, or phone OTP |
| Rep | Email + password |
| Supplier | Email + password, **admin-approved before activation** |
| Admin | Email + password |

- Supabase Auth, JWT sessions, persistent login on mobile
- Students self-register and pick their rep at signup
- Suppliers self-register into `pending_approval` and cannot list products until the admin approves
- Role lives on `profiles.role` and is enforced in RLS, not only in the UI

**RLS policies to implement (write these explicitly, test each one):**

- Students read and write only their own orders and order items
- Reps read orders where `rep_id` matches their id; they may update `fulfillment_status` and `payment_status` only
- Suppliers read orders where `supplier_id` matches their id; same restricted update rights; full CRUD on their own products only
- Admin reads everything; writes to `suppliers.commission_rate`, `profiles.status`, `representatives.subscription_paid_until`, `commission_statements`
- **No role may update `unit_price`, `line_total`, `subtotal`, `commission_amount`, or `total_price` on an existing order.** Totals are computed server-side at insert.

---

## 12. Design system

Match the existing mockups exactly.

```css
--bg:         #0e0e11;   /* near-black base */
--surface:    #16161a;   /* cards */
--border:     rgba(255,255,255,0.08);
--text:       #f0f0f0;
--text-muted: #6b6b7a;
--accent:     #c8f04a;   /* primary — lime */
--accent2:    #7b61ff;   /* violet */
--frasaco:    #c8f04a;
--copy-a:     #61d0ff;
--supplier:   #639922;
--warning:    #ef9f27;
```

- **Headings:** Syne, 600–800
- **Body:** DM Sans, 300–500
- **Radius:** 16px cards, 10px small elements
- Dark theme is the default and primary. If a light mode ships, it must be deliberate, not an inverted accident.
- Animation: restrained micro-motion on tooth selection, order confirmation, and route transitions. Reference Arc Browser and Bump. Respect `prefers-reduced-motion`.
- Every empty state is designed. No blank screens anywhere.
- Tone: friendly and professional. The users are dental students in their twenties.

---

## 13. Build order

Ship in this sequence. Each phase must be deployed and working before the next starts.

**Phase 1 — Foundation**
Next.js + Supabase + Tailwind. Full schema migration. Auth for all four roles. RLS policies written and tested. Role-based routing.

**Phase 2 — Tooth ordering (the core)**
Student registration and rep selection. The SVG dental chart. Order builder with live totals. Submit and confirm. Order history and one-tap reorder. Rep dashboard with the weekly batching summary and pricing settings.

*Stop here and get real students using it. This phase is the product.*

**Phase 3 — Store**
Supplier registration and admin approval. Product CRUD with image upload. Store browse, search, product detail. Cart with per-supplier splitting. Checkout. Supplier order dashboard.

*One slice of this is built ahead of the rest: "Extras from your seller" — a seller lists a few products (no images), and a student adds them to their weekly order with that same seller. One seller, one order, one pickup, one payment, no commission. Everything else in Phase 3 stays gated; see CLAUDE.md.*

**Phase 4 — Admin & money**
Admin dashboard. Commission rate management. Monthly statement generation. Platform metrics.

**Phase 5 — Polish**
PWA manifest and service worker. Animation pass. Empty states. Performance to target. Accessibility pass.

---

## 14. Performance & quality targets

- First contentful paint under 2s on 4G
- Dental chart interactive within 1s of route entry
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95 on mobile
- Works on iOS Safari 16+ and Chrome Android
- TypeScript strict, zero `any` in application code
- Every server action input validated with Zod

---

## 15. Acceptance criteria

The build is done when all of the following are true:

**Tooth ordering**
1. A student can register, pick a rep, and submit a tooth order in under 30 seconds
2. The order total on the review screen exactly equals the sum of quantity × the rep's current price for each line
3. A rep changing their price does not alter the total of any existing order
4. A rep sees the order in their dashboard and can mark it confirmed, fulfilled, and paid
5. The weekly summary correctly totals Frasaco and Copy A across all students for a given week
6. One-tap reorder reproduces a past order with the week bumped forward

**Store**
7. A supplier cannot list products until an admin approves their account
8. A cart containing products from two suppliers produces exactly two orders at checkout, and the student is told this before confirming
9. `commission_amount` on a store order equals `subtotal × commission_rate / 100`, snapshotted at checkout
10. A supplier sees only their own products and only their own orders
11. A student never sees any commission figure anywhere in the interface

**Security**
12. Every table has RLS enabled
13. A rep authenticated in the browser cannot read another rep's orders through the API
14. A supplier cannot read tooth orders through the API
15. No mutation succeeds from the client without passing through a server action
16. A crafted request cannot alter the price or total of an existing order

**Quality**
17. Every screen works at 375px width
18. Every list has a designed empty state
19. Lighthouse mobile Performance ≥ 90 and Accessibility ≥ 95
20. The app installs as a PWA on iOS and Android

---

## 16. Open questions for the owner

Do not block on these. Build the stated default and flag the question.

1. **Academic week mapping** — what calendar date is week 1? Default: rep sets a semester start date in settings.
2. **Product categories** — the initial list needs to come from the supplier. Default: Disposables, Instruments, Materials, Equipment, Lab.
3. **Delivery** — does the supplier deliver to campus or to an address? Default: free-text address plus a supplier delivery note at checkout.
4. **Multi-rep students** — can a student switch reps mid-semester? Default: yes, from settings; past orders keep their original rep.
5. **Store minimum order** — is there one? Default: none in v1.
