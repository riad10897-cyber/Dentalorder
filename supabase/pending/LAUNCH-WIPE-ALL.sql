-- Launch wipe: delete EVERY account and EVERY order. A clean start.
--
-- Run in the Supabase SQL Editor. TEST project first, then production.
-- This cannot be undone. On production, download a backup first:
-- Database → Backups.
--
-- Deletes: every order and order line, every commission statement, every
-- login, profile, seller listing, tooth price and product. Your own
-- account and Majzoub's go too.
--
-- Keeps: the database structure, its security rules, and the five
-- product categories.
--
-- Supabase will warn that this query is destructive. That is expected:
-- confirm and run.

begin;

-- Order lines go first: they point at orders and at products.
delete from public.order_items;
delete from public.orders;
delete from public.commission_statements;

-- Deleting the logins removes every profile, seller listing and product
-- with them.
delete from auth.users;

-- What is left. Expect every number to be 0, and categories 5.
select
  (select count(*) from auth.users)                  as accounts,
  (select count(*) from public.profiles)             as profiles,
  (select count(*) from public.suppliers)            as sellers,
  (select count(*) from public.products)             as products,
  (select count(*) from public.orders)               as orders,
  (select count(*) from public.order_items)          as order_lines,
  (select count(*) from public.product_categories)   as categories;

commit;
