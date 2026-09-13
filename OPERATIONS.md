# Running DentalOrder — a guide for Riad

This is for you, not a developer. No jargon, no code. Everything here happens by clicking around in two websites: **Vercel** (where the app is hosted) and **Supabase** (where the data lives — students, reps, orders, prices).

If you ever feel unsure about a step, stop and ask before clicking — most things here are easy to undo, but a couple aren't, and those are marked.

---

## 1. Onboarding a new rep

Reps sign themselves up — you don't create their account for them.

1. Tell the new rep to go to the site and sign up as **Representative**. They pick their own name, university, and set up their account.
2. They collect their subscription fee from you (or you invoice them) **offline** — cash, Whish, bank transfer. The app has no payment step for this.
3. Once they've paid, go into Supabase and mark them as paid:
   - Open the [Supabase dashboard](https://supabase.com/dashboard) → your project.
   - Left sidebar → **Table Editor**.
   - Open the **representatives** table.
   - Find their row (search by their name in the `display_name` column).
   - Click into the `subscription_paid_until` cell for that row and set it to the date their subscription runs out (e.g. one year from today).
   - Save.

That's it — nothing else needs to be created by hand. Students find this rep automatically in the sign-up list once they've registered.

**If a rep's subscription lapses:** clear or leave `subscription_paid_until` in the past — the spec treats an expired rep as read-only, but note that this isn't enforced in the app yet (Phase 4). For now, an expired rep can still work normally; treat the date as a reminder for yourself, not an automatic lock.

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
5. You'll see every order that student has placed: which week, the total, whether it's paid, and whether the rep has confirmed/fulfilled it.

This is read-only — running this query can't change or break anything, so don't worry about clicking Run.

---

## 4. Changing a rep's prices for them

Reps can do this themselves under Settings in the app. If one asks you to do it instead:

1. Supabase dashboard → **Table Editor** → **representatives** table.
2. Find their row.
3. Edit `frasaco_price` and/or `copy_a_price` directly (just the number, e.g. `2.50`).
4. Save.

This only affects **future** orders. Every order already placed keeps the price it was charged at — that's a hard rule in the system, not just a setting, so you can't accidentally change a past order's total this way even if you tried.

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

---

## 6. Known limits — things to watch for

- **Email confirmation is off.** New sign-ups don't need to click a confirmation email — this was turned off on purpose so testing wouldn't need real inboxes. It also means anyone can sign up with any email, even one they don't own. Before this matters at real scale, turn on a proper email service (see CLAUDE.md's Auth notes) and re-enable confirmation in Supabase under **Authentication → Providers → Email**.

- **Supabase's free tier can pause the whole project if it goes quiet.** Free Supabase projects that see zero activity for about a week get automatically paused, and the site will stop working until someone goes into the Supabase dashboard and un-pauses it (one click, no data lost — but the site is down until you do). If you expect gaps of a week or more with no student orders (e.g. semester break), check in on the Supabase dashboard occasionally, or consider upgrading to a paid Supabase plan before that happens.

- **Free tier also caps database size, bandwidth, and monthly active users.** These limits are generous for a few hundred students placing weekly orders, but they do exist and Supabase's exact numbers change over time — check the current limits on Supabase's own pricing page if the app ever feels slow or starts rejecting sign-ins, since hitting a cap is a likely cause. The fix is upgrading the Supabase plan, not a code change.

- **No payment processing in the app.** All money — rep subscriptions, student payments to reps — happens outside the app (cash, Whish, bank transfer). The app only tracks who owes what and who's paid; it never moves money.
