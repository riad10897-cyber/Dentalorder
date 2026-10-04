-- The seller sets the week. Every new order takes it.
--
-- Until now each order's week was a counter per student: a student's first
-- order was week 1, their second week 2, whatever week of the semester it
-- really was. After the launch wipe every student started at week 1 again,
-- while the class was in week 4, and the seller's "What to buy" list split
-- one week's orders across several numbers.
--
-- 1. suppliers.current_week: the semester week this seller is taking
--    orders for, 1 to 17. The seller changes it from their Orders screen
--    (their own row, under the existing suppliers_update_own policy).
-- 2. A trigger stamps every new weekly order with its seller's current
--    week, whatever week the request asked for. Students never choose a
--    week, so nothing they send can put an order in the wrong one. An
--    edited order is a new row too, so it moves into the seller's current
--    week; an order already placed never changes week.
--
-- No price, total or existing order is touched. Safe to run twice.

alter table public.suppliers
  add column if not exists current_week smallint not null default 1;

alter table public.suppliers drop constraint if exists suppliers_current_week_range;
alter table public.suppliers
  add constraint suppliers_current_week_range check (current_week between 1 and 17);

create or replace function public.set_order_week()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_type::text = 'tooth' and new.supplier_id is not null then
    select s.current_week into new.week_number
    from public.suppliers s
    where s.id = new.supplier_id;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_week on public.orders;
create trigger orders_set_week
  before insert on public.orders
  for each row execute function public.set_order_week();

-- ── For launch only: the class is in week 4 ─────────────────────────
-- Puts every seller on week 4. Sellers change it themselves from now on.
update public.suppliers set current_week = 4 returning display_name, current_week;
