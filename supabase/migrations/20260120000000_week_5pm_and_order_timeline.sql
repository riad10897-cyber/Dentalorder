-- ═══════════════════════════════════════════════════════════════════
-- Ordering weeks switch at Saturday 5:00 PM; each order keeps a timeline
-- ═══════════════════════════════════════════════════════════════════
--
-- Two requests from the sellers (24 Oct 2026):
--
-- 1. The weekly switch moves from Saturday 1:00 PM to Saturday 5:00 PM,
--    Beirut time. Students are asked to order by 4:50 PM. Every week from
--    now runs Saturday 5:00 PM to Saturday 5:00 PM.
--
--    Only the fixed starting point of ordering_week_index changes (13:00
--    to 17:00 on 3 Jan 2026). Run this between a Saturday 5:00 PM and the
--    next Saturday 1:00 PM: inside the old 1–5 PM gap a seller's current
--    week would read one lower until 5:00 PM. Orders already placed keep
--    their week.
--
-- 2. A timeline per order: when it was placed (created_at, as before),
--    confirmed, handed over, paid, rejected or had items taken off. The
--    times are stamped by the database whenever the status changes; no
--    app or person can write them (they are not in any update grant, and
--    only security definer functions insert orders). Undoing a step
--    clears its time, so the timeline shows what is true now.
--
--    Existing orders get the one time we know: the order's last change,
--    for the step it is at now. Earlier steps of those orders stay blank.
--
-- No price, total or line changes. Safe to run twice.

-- ── 1. Saturday 5:00 PM ───────────────────────────────────────────────

create or replace function public.ordering_week_index(p_at timestamptz)
returns integer
language sql
stable
set search_path = public
as $$
  select floor(
    extract(epoch from ((p_at at time zone 'Asia/Beirut') - timestamp '2026-01-03 17:00')) / 604800
  )::integer;
$$;

-- ── 2. The timeline ───────────────────────────────────────────────────

alter table public.orders add column if not exists confirmed_at timestamptz;
alter table public.orders add column if not exists fulfilled_at timestamptz;
alter table public.orders add column if not exists paid_at      timestamptz;
alter table public.orders add column if not exists rejected_at  timestamptz;
alter table public.orders add column if not exists amended_at   timestamptz;

comment on column public.orders.confirmed_at is 'When the seller confirmed it. Stamped by the database; cleared if undone.';
comment on column public.orders.fulfilled_at is 'When the seller handed it over. Stamped by the database; cleared if undone.';
comment on column public.orders.paid_at      is 'When the seller marked it paid. Stamped by the database; cleared if undone.';
comment on column public.orders.rejected_at  is 'When the seller rejected it. Stamped by the database.';
comment on column public.orders.amended_at   is 'When the seller took unavailable items off (the order this one replaced is amended_from).';

create or replace function public.stamp_order_times()
returns trigger
language plpgsql
as $$
begin
  -- Whatever a request sends for these is never kept: only a status
  -- change sets or clears them.
  new.confirmed_at := old.confirmed_at;
  new.fulfilled_at := old.fulfilled_at;
  new.paid_at      := old.paid_at;
  new.rejected_at  := old.rejected_at;
  new.amended_at   := old.amended_at;

  if new.fulfillment_status is distinct from old.fulfillment_status then
    case new.fulfillment_status::text
      when 'confirmed' then
        -- Reached from pending: confirmed now. Back from handed over (an
        -- undo): still confirmed as before, no longer handed over.
        if old.fulfillment_status::text = 'pending' then new.confirmed_at := now(); end if;
        new.fulfilled_at := null;
      when 'fulfilled' then new.fulfilled_at := now();
      when 'rejected'  then new.rejected_at  := now();
      when 'pending'   then new.confirmed_at := null; new.fulfilled_at := null;
      else null;
    end case;
  end if;

  if new.payment_status is distinct from old.payment_status then
    new.paid_at := case when new.payment_status::text = 'paid' then now() else null end;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_stamp_times on public.orders;
create trigger orders_stamp_times
  before update on public.orders
  for each row execute function public.stamp_order_times();

-- Existing orders: the time we have for the step they are at.
alter table public.orders disable trigger orders_stamp_times;
alter table public.orders disable trigger orders_set_updated_at;
update public.orders set confirmed_at = updated_at
 where confirmed_at is null and fulfillment_status::text = 'confirmed';
update public.orders set fulfilled_at = updated_at
 where fulfilled_at is null and fulfillment_status::text = 'fulfilled';
update public.orders set rejected_at = updated_at
 where rejected_at is null and fulfillment_status::text = 'rejected';
update public.orders set paid_at = updated_at
 where paid_at is null and payment_status::text = 'paid';
alter table public.orders enable trigger orders_set_updated_at;
alter table public.orders enable trigger orders_stamp_times;

-- ── 3. Taking items off keeps the timeline ────────────────────────────

create or replace function public.remove_unavailable_lines(
  p_order_id uuid,
  p_line_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller   uuid := auth.uid();
  v_old      public.orders%rowtype;
  v_new      uuid;
  v_total    numeric(10,2);
  v_removed  jsonb;
  v_known    integer;
  v_left     integer;
begin
  if v_seller is null then
    raise exception 'must be signed in';
  end if;
  if p_line_ids is null or cardinality(p_line_ids) = 0 then
    raise exception 'choose at least one item to take off';
  end if;

  -- Locked, so a student editing or cancelling at the same moment either
  -- waits and then finds it replaced, or wins and this finds it changed.
  select * into v_old from public.orders where id = p_order_id for update;

  -- Someone else's order reads exactly like no order at all.
  if not found or v_old.supplier_id is distinct from v_seller or v_old.replaced_by is not null then
    raise exception 'order not found';
  end if;
  if v_old.order_type::text <> 'tooth' then
    raise exception 'only a weekly order can be changed here';
  end if;
  if v_old.fulfillment_status::text not in ('pending', 'confirmed') then
    raise exception 'this order can no longer be changed — it is already %',
      case v_old.fulfillment_status::text
        when 'fulfilled' then 'handed over'
        when 'rejected'  then 'rejected'
        when 'cancelled' then 'cancelled'
        else v_old.fulfillment_status::text
      end
      using errcode = 'DT002';
  end if;

  -- Every id must be a line on THIS order. Ids are distinct-counted, so
  -- sending one twice changes nothing.
  select count(*) into v_known
  from public.order_items
  where order_id = p_order_id and id = any (p_line_ids);
  if v_known <> (select count(distinct x) from unnest(p_line_ids) x) then
    raise exception 'that item is not on this order';
  end if;

  select count(*) into v_left
  from public.order_items
  where order_id = p_order_id and not (id = any (p_line_ids));
  if v_left = 0 then
    raise exception 'at least one item must stay on the order'
      using errcode = 'DT004';
  end if;

  -- The new total: the lines that stay, at the prices they were charged.
  select coalesce(sum(line_total), 0) into v_total
  from public.order_items
  where order_id = p_order_id and not (id = any (p_line_ids));

  -- What was taken off, as it was charged, added to anything taken off
  -- an earlier version of this order.
  select v_old.unavailable_lines || coalesce(jsonb_agg(jsonb_build_object(
           'tooth_number', tooth_number,
           'tooth_type',   tooth_type,
           'product_name', product_name,
           'product_unit', product_unit,
           'quantity',     quantity,
           'unit_price',   unit_price,
           'line_total',   line_total
         ) order by tooth_number nulls last, product_name), '[]'::jsonb)
    into v_removed
  from public.order_items
  where order_id = p_order_id and id = any (p_line_ids);

  insert into public.orders (
    order_type, student_id, supplier_id, week_number,
    subtotal, commission_rate, commission_amount, total_price,
    payment_status, fulfillment_status, notes, created_at,
    amended_from, unavailable_lines,
    confirmed_at, fulfilled_at, paid_at, amended_at
  )
  values (
    v_old.order_type, v_old.student_id, v_old.supplier_id, v_old.week_number,
    v_total, 0, 0, v_total,
    v_old.payment_status, v_old.fulfillment_status, v_old.notes, v_old.created_at,
    v_old.id, v_removed,
    -- The same order's history carries over; taking items off is its
    -- newest step.
    v_old.confirmed_at, v_old.fulfilled_at, v_old.paid_at, now()
  )
  returning id into v_new;

  -- The lines that stay, copied exactly: same tooth or product, same
  -- snapshot name, unit and price.
  insert into public.order_items (
    order_id, tooth_number, tooth_type,
    product_id, product_name, product_unit,
    quantity, unit_price, line_total
  )
  select v_new, tooth_number, tooth_type,
         product_id, product_name, product_unit,
         quantity, unit_price, line_total
  from public.order_items
  where order_id = p_order_id and not (id = any (p_line_ids));

  update public.orders
     set fulfillment_status = 'cancelled',
         replaced_by        = v_new
   where id = p_order_id;

  return v_new;
end;
$$;

revoke all on function public.remove_unavailable_lines(uuid, uuid[]) from public;
revoke all on function public.remove_unavailable_lines(uuid, uuid[]) from anon;
grant execute on function public.remove_unavailable_lines(uuid, uuid[]) to authenticated;
