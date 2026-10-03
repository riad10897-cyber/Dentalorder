# Running DentalOrder — a guide for Riad

This is for you, not a developer. No jargon, no code. Everything here happens by clicking around in two websites: **Vercel** (where the app is hosted) and **Supabase** (where the data lives — students, reps, orders, prices).

If you ever feel unsure about a step, stop and ask before clicking — most things here are easy to undo, but a couple aren't, and those are marked.

---

## 1. Making someone a supplier — the one job only you can do

Nobody can sign up as a supplier. Every sign-up is a student account, and
the database enforces that, not just the form. You decide who sells, and you
turn their account into a supplier by hand.

**Step 1 — they sign up as a student**, the normal way, in the app.

**Step 2 — you make them a supplier.** Supabase dashboard → **SQL Editor** →
**New query**. Fill in three things — their email, the name students will
see in the market, and their faculty — then press **Run**:

```sql
insert into public.suppliers (id, kind, display_name, university, status)
select id, 'student_supplier', 'Name students will see', 'BAU', 'active'
from auth.users
where email = 'them@example.com'
returning id, display_name, kind, status;
```

The `returning` line means Supabase prints the row it created. **If it prints
nothing, nothing was created** — the email did not match. Check for a typo
and run it again.

**If it says `duplicate key`**, that person is already a supplier. Nothing
changed.

For a shop rather than a student who sells, change `'student_supplier'` to
`'shop'`. For a supplier who serves every faculty, change `'BAU'` to `null`
(no quotes).

They start at $2.50 Frasaco and $1.20 Copy A. They set their own prices in
the app under Products, and should do that before telling their class.

They can also list a few extras — gloves, burs, masks — under **Products**,
in one of five fixed categories. Students see a seller's extras under the
chart when ordering from them, and add them to the same weekly order. There
is no commission on extras. A product that has ever been ordered can't be
deleted, only switched off: past orders keep its name and price as they were.

They appear in the market within five minutes (the market list is cached
that long). The next time they open the app they land on the supplier
screens.

**To stop someone supplying** — they graduated, or stopped selling — set them
to `suspended`. Their past orders are untouched; they disappear from the
market and cannot take new orders.

```sql
update public.suppliers
set status = 'suspended'
where id = (select id from auth.users where email = 'them@example.com')
returning id, display_name, status;
```

To let them sell again, the same query with `'active'`. Again: if it prints
nothing, nothing changed.

**On the subscription fee:** you collect it offline — cash, Whish, bank
transfer. The app has no payment step for it. Making someone a supplier is
the lever: don't run step 2 until they've paid you.

---

## 2. Promoting someone to admin

There is no "sign up as admin" option — that was removed on purpose, so nobody can grant themselves admin. You do this by hand, in Supabase:

1. The person should first sign up normally as a **Student** (or whatever role fits — it doesn't matter, you're about to change it).
2. Supabase dashboard → **Table Editor** → **profiles** table.
3. Find their row — search by their name in `full_name`, or ask for the email they signed up with and check against Supabase's **Authentication → Users** page to match the email to a name.
4. Click their `role` cell, change it from `student` to `admin`.
5. Save.

They'll see the admin area next time they sign in. (There isn't an admin dashboard built yet — that's Phase 4 — so this mainly matters for future-proofing and for using Supabase itself with full visibility.)

---

## 3. Looking up a student's orders

When a student messages you confused about an order, do this:

1. Supabase dashboard → **SQL Editor** (left sidebar).
2. Click **New query**.
3. Paste this in, replacing `student@email.com` with the student's actual email:

   ```sql
   select o.week_number, o.total_price, o.payment_status, o.fulfillment_status, o.created_at
   from orders o
   join profiles p on p.id = o.student_id
   where p.full_name ilike '%student name here%'
   order by o.created_at desc;
   ```

   You can search by name (fill in part of their name between the `%` signs) instead of email if that's easier — it matches partial names.
4. Click **Run** (or press Cmd/Ctrl+Enter).
5. You'll see every order that student has placed: which week, the total, whether it's paid, and whether the supplier has confirmed/fulfilled it.

This is read-only — running this query can't change or break anything, so don't worry about clicking Run.

---

## 4. Changing a supplier's prices for them

Suppliers do this themselves under Products in the app. If one asks you to do
it instead, SQL Editor → New query, with their email and the new prices:

```sql
update public.suppliers
set frasaco_price = 2.50,
    copy_a_price  = 1.20
where id = (select id from auth.users where email = 'them@example.com')
returning display_name, frasaco_price, copy_a_price;
```

Again: if it prints nothing, nothing changed.

This only affects **future** orders. Every order already placed keeps the price
it was charged at — that's a hard rule in the system, not just a setting, so
you can't accidentally change a past order's total this way even if you tried.

---

## 5. When something breaks

**The site won't load, or shows an error:**
- Vercel dashboard → your project → **Deployments** tab.
- Click the most recent deployment (top of the list).
- Look for a red ❌ instead of green ✓. If it's red, the last deploy failed — the site is still running the previous working version, so it's usually not urgent, but the next code push won't go live until this is fixed.
- Click **Runtime Logs** (or "Logs") on that deployment to see the actual error text if the site is live but throwing errors on some pages.

**Something about logging in, or a specific action, is broken:**
- Supabase dashboard → your project → **Logs** (left sidebar).
- Pick **Postgres Logs** for database errors, **Auth Logs** for sign-in/sign-up problems, or **API Logs** for anything else.
- Errors show up with a timestamp — look for one around when the problem happened.

**If you can't make sense of a log:** copy the error text and paste it back to me (or the next developer) — you don't need to understand it yourself.

**If every page errors after you touched an environment variable in Vercel:** this has happened twice — someone pastes the Supabase URL with extra text stuck on the end (like `/rest/v1/`) instead of just the plain address. The build now catches this automatically and refuses to deploy with a clear message, but if you're editing `NEXT_PUBLIC_SUPABASE_URL` by hand: it must be exactly `https://xxxxxxxx.supabase.co` — nothing before or after it, no trailing slash. Copy it fresh from Supabase → Project Settings → API → Project URL each time rather than editing the existing value. After saving any environment variable, Vercel will prompt you to **Redeploy** — that step isn't optional, the change does nothing until you click it.

---

## 6. The test Supabase project (one-time setup)

There is one rule in DentalOrder that everything else rests on: **a supplier
changing their prices must never change what a past order cost.** A student
who ordered at $2.50 owes $2.50, forever, even if the supplier moves to $3.00
tomorrow.

That rule lives in the database, not in the app code, so no ordinary test can
check it. Instead, a GitHub Action signs up a fake supplier and a fake student,
places a real order, changes the price, and checks the old order did not move.
If it ever does move, the build goes red.

It needs to create and delete accounts, which needs the **secret key** — and
the production secret key must never sit in GitHub. So this runs against a
**second, throwaway Supabase project** that holds nothing real.

### What to create

1. Go to **supabase.com** → **New project**.
2. Name it `dentalorder-test`. Any region, free tier is fine.
3. Pick a database password and save it somewhere — you won't need it often.
4. Wait for it to finish setting up (a minute or two).

### Put the schema in it

5. Open the new project → **SQL Editor** → **New query**.
6. Open `supabase/schema-full.sql`, copy the whole file, paste it in, press
   **Run** — once. That one file is every migration in order, and it has
   been tested top to bottom on an empty database. You should see "Success"
   and a few grey "notice" lines, which are expected.

   (The separate files in `supabase/migrations/` are for a project that
   already has data. Do not use them here — and do not use `schema-full.sql`
   on production, which already has the schema.)
7. Go to **Authentication → Providers → Email** and turn **Confirm email**
   **off**, same as production. The test signs accounts in immediately and
   cannot click a confirmation link.

### Add the three secrets to GitHub

8. In the new project: **Project Settings → API**. You need two values from
   this page, and they are not the same as production's — copy them from the
   test project, not the live one.
9. On GitHub, go to the DentalOrder repository → **Settings** →
   **Secrets and variables** → **Actions** → **New repository secret**.
10. Add these three:

| Secret name | Where it comes from |
|---|---|
| `TEST_SUPABASE_URL` | Test project → Project Settings → API → **Project URL** |
| `TEST_SUPABASE_PUBLISHABLE_KEY` | Test project → Project Settings → API → the **publishable / anon** key |
| `TEST_SUPABASE_SECRET_KEY` | Test project → Project Settings → API → the **secret / service_role** key |

The workflow refuses to run if any of the three is missing, and refuses to run
if `TEST_SUPABASE_URL` turns out to be the production project — so a
copy-paste slip can't have CI creating accounts in the live database.

### Keeping it in step

Every time a new file appears in `supabase/migrations/` and you run it against
production, run the same file against `dentalorder-test` too. If the two drift
apart, the test still passes but it is no longer testing the schema that
students are using, which is worse than having no test. There is no automatic
check for this yet.

---

## 7. Known limits — things to watch for

- **Email confirmation is off.** New sign-ups don't need to click a confirmation email — this was turned off on purpose so testing wouldn't need real inboxes. It also means anyone can sign up with any email, even one they don't own. Before this matters at real scale, turn on a proper email service (see CLAUDE.md's Auth notes) and re-enable confirmation in Supabase under **Authentication → Providers → Email**.

- **Supabase's free tier can pause the whole project if it goes quiet.** Free Supabase projects that see zero activity for about a week get automatically paused, and the site will stop working until someone goes into the Supabase dashboard and un-pauses it (one click, no data lost — but the site is down until you do). If you expect gaps of a week or more with no student orders (e.g. semester break), check in on the Supabase dashboard occasionally, or consider upgrading to a paid Supabase plan before that happens.

- **Free tier also caps database size, bandwidth, and monthly active users.** These limits are generous for a few hundred students placing weekly orders, but they do exist and Supabase's exact numbers change over time — check the current limits on Supabase's own pricing page if the app ever feels slow or starts rejecting sign-ins, since hitting a cap is a likely cause. The fix is upgrading the Supabase plan, not a code change.

- **No payment processing in the app.** All money — supplier subscriptions, student payments to suppliers — happens outside the app (cash, Whish, bank transfer). The app only tracks who owes what and who's paid; it never moves money.
