-- Ordering weeks: Saturday 1:00 PM to Saturday 1:00 PM, Beirut time.
--
-- Until now each order's week was a counter per student: a student's first
-- order was week 1, their second week 2, whatever week of the semester it
-- really was. After the launch wipe every student started at week 1 again
-- while the class was in week 4.
--
-- Now a week belongs to the seller, and it moves on by itself:
--
-- 1. suppliers.current_week (1-17) is the week the seller last set, and
--    suppliers.week_set_at is when. Set by the seller from their Orders
--    screen, under the existing suppliers_update_own policy; week_set_at
--    is always stamped by the database with the time of the change.
-- 2. public.effective_week() adds one week for every Saturday 1:00 PM
--    (Asia/Beirut, wall clock, so summer and winter time both hold) that
--    has passed since then, and stops at 17. No scheduled job: the week is
--    worked out whenever it is needed, so it cannot miss a Saturday.
-- 3. A trigger files every new weekly order under its seller's effective
--    week at the moment it is placed, whatever week the request named.
--    An order already placed never changes week. An edited order is a new
--    row, so it is filed under the week it is edited in.
--
-- No price, total or existing order is touched. Safe to run twice.

alter table public.suppliers
  add column if not exists current_week smallint not null default 1;
alter table public.suppliers
  add column if not exists week_set_at timestamptz not null default now();

alter table public.suppliers drop constraint if exists suppliers_current_week_range;
alter table public.suppliers
  add constraint suppliers_current_week_range check (current_week between 1 and 17);

-- Which ordering week a moment falls in, counted from a fixed Saturday
-- 1:00 PM in Beirut (3 Jan 2026). Only differences between two of these
-- matter, so the starting point itself means nothing.
create or replace function public.ordering_week_index(p_at timestamptz)
returns integer
language sql
stable
set search_path = public
as $$
  select floor(
    extract(epoch from ((p_at at time zone 'Asia/Beirut') - timestamp '2026-01-03 13:00')) / 604800
  )::integer;
$$;

create or replace function public.effective_week(p_week smallint, p_set_at timestamptz, p_at timestamptz default now())
returns smallint
language sql
stable
set search_path = public
as $$
  select least(17, greatest(1,
    p_week + public.ordering_week_index(p_at) - public.ordering_week_index(p_set_at)
  ))::smallint;
$$;

-- The seller sets a week; the database records when. Any write that
-- touches current_week or week_set_at counts as setting the week now —
-- including setting it to the number it already holds, which restarts
-- the count from today. Whatever time a request sends is never kept.
create or replace function public.stamp_week_set_at()
returns trigger
language plpgsql
as $$
begin
  if new.current_week is distinct from old.current_week
     or new.week_set_at is distinct from old.week_set_at then
    new.week_set_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists suppliers_stamp_week_set_at on public.suppliers;
create trigger suppliers_stamp_week_set_at
  before update on public.suppliers
  for each row execute function public.stamp_week_set_at();

create or replace function public.set_order_week()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_type::text = 'tooth' and new.supplier_id is not null then
    select public.effective_week(s.current_week, s.week_set_at)
      into new.week_number
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
