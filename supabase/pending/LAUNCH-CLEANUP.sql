-- Launch cleanup: wipe every order, and every account except three.
--
-- Run in the Supabase SQL Editor. TEST project first, then production.
-- This cannot be undone. Take a backup first on production:
-- Database → Backups (or Project Settings → Database → download a backup).
--
-- What it deletes:
--   * every order and every order line, for everyone (kept accounts too)
--   * every commission statement
--   * every account not in the keep list below, with its profile, its
--     seller listing and that seller's products
--
-- What it keeps:
--   * the three accounts in the keep list, their profiles, and — if one of
--     them is a seller — that seller's listing, tooth prices and products
--   * product categories
--
-- ── STEP 1 — look first ─────────────────────────────────────────────
-- Run only this block. It changes nothing. Find the three emails to keep.

select u.email,
       p.full_name,
       p.role,
       (select count(*) from public.suppliers s where s.id = u.id) as is_seller,
       (select count(*) from public.orders o where o.student_id = u.id or o.supplier_id = u.id) as orders,
       u.created_at::date as joined
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;


-- ── STEP 2 — delete ─────────────────────────────────────────────────
-- Put the three emails in the list, exactly as STEP 1 shows them.
-- Then select from "begin;" to "commit;" and run it.
-- If any email is wrong, it stops and deletes nothing.

begin;

create temporary table keep_emails (email text primary key) on commit drop;
insert into keep_emails (email) values
  ('FIRST-TEST-ACCOUNT@example.com'),
  ('SECOND-TEST-ACCOUNT@example.com'),
  ('MAJZOUB-EMAIL@example.com');

do $$
declare
  found int;
begin
  select count(*) into found
  from auth.users u
  join keep_emails k on lower(k.email) = lower(u.email);
  if found <> 3 then
    raise exception 'Stopped: only % of the 3 emails match an account. Nothing was deleted. Check the spelling.', found;
  end if;
end $$;

-- Order lines go first: they point at orders and at products.
delete from public.order_items;
delete from public.orders;
delete from public.commission_statements;

-- Deleting the login removes the profile, the seller listing and that
-- seller's products with it.
delete from auth.users u
where not exists (select 1 from keep_emails k where lower(k.email) = lower(u.email));

-- What is left. Expect: accounts 3, profiles 3, orders 0, order lines 0.
select
  (select count(*) from auth.users)          as accounts,
  (select count(*) from public.profiles)     as profiles,
  (select count(*) from public.suppliers)    as sellers,
  (select count(*) from public.products)     as products,
  (select count(*) from public.orders)       as orders,
  (select count(*) from public.order_items)  as order_lines;

commit;
