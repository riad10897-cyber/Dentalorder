-- ═══════════════════════════════════════════════════════════════════
-- RUN THIS TWICE: once in PRODUCTION, once in the TEST project.
-- ═══════════════════════════════════════════════════════════════════
--
-- Same file, both projects, either order. Safe to run more than once.
-- It adds one trigger; it changes no data and touches no existing row.
--
-- What it fixes: the secret key (and the SQL Editor) could rewrite a
-- line's price on an existing order. The Money rules workflow caught it
-- the first time it actually ran. The trigger below refuses any change
-- to an order line, for every role.
--
-- After it runs in the TEST project, re-run the Money rules workflow —
-- the ninth check should pass.

-- ═══════════════════════════════════════════════════════════════════
-- An order line cannot be changed after it is written — by anyone
-- ═══════════════════════════════════════════════════════════════════
--
-- CLAUDE.md: "No route or role may edit unit_price, line_total, subtotal,
-- commission_amount, or total_price on an existing order."
--
-- orders has held that since the first migration: a trigger refuses any
-- change to its money and identity columns, and a trigger fires for every
-- role, including the secret key. order_items never got one. Its only
-- protection was having no UPDATE policy, which stops a student or a
-- supplier but not the secret key or the SQL Editor — both bypass RLS.
--
-- The Money rules workflow found it the first time it actually ran: the
-- secret key set a line's unit_price and line_total to 0.01 and they
-- stuck. Reproduced on production with a throwaway order: the line read
-- $0.01 while the order total still read $5.00, so the order and its own
-- lines disagreed. A student's token was already refused.
--
-- No app code has ever written to order_items after insert, so nothing
-- that runs today is affected. This closes it for the roles RLS cannot.
--
-- Why refuse every update rather than list columns: a line has no field
-- that may legitimately change. order_id, tooth_number, tooth_type,
-- product_id say what it is; quantity, unit_price and line_total are the
-- money; product_name is a snapshot of the name at the time, for the same
-- reason the price is. A column list would only be a way to forget one
-- when a column is added.
--
-- DELETE is deliberately left alone. Removing a line outright is how test
-- data is cleaned up and how an admin would remove an order entirely, and
-- it is still closed to students and suppliers by RLS.

create or replace function public.protect_order_items()
returns trigger
language plpgsql
as $$
begin
  raise exception 'order_items: a line cannot be changed after it is written. Its price, quantity and tooth are what was charged.'
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists order_items_protect on public.order_items;
create trigger order_items_protect
  before update on public.order_items
  for each row execute function public.protect_order_items();
