-- ═══════════════════════════════════════════════════════════════════
-- A seller can take an unavailable item off an order
-- ═══════════════════════════════════════════════════════════════════
--
-- Maria's case: a student orders 14, 36 and 47, the order is confirmed,
-- and then the seller's own supplier has no 14. Until now the only way
-- out was to reject the whole order (and only while it was pending).
--
-- The owner approved one exception to "no route may change a total on
-- an existing order" (CLAUDE.md, 17 Oct 2026): a seller may REMOVE lines
-- that turn out to be unavailable, and the database works out the new
-- total. Nothing is ever edited in place. Like a student's edit, it is a
-- swap, in one transaction:
--
--   1. the remaining lines are copied onto a fresh order, AT THE PRICES
--      THEY WERE FIRST CHARGED AT — never today's prices. Removing a tooth
--      must not reprice the others;
--   2. the new total is the sum of those copied lines, computed here;
--   3. the old order is cancelled and points at the new one, exactly as
--      an edit does. It stays in the database, untouched, as the record
--      of what was first ordered.
--
-- What the seller can do, all enforced here:
--   - only on their own order, while it is pending or confirmed (not once
--     it is handed over, rejected or cancelled);
--   - only remove: they pass the ids of lines on that order, nothing else.
--     No price, quantity or new line is ever read from the request;
--   - at least one line must stay. An order with nothing available is
--     rejected (pending) or settled with the student (confirmed);
--   - the new order keeps the old one's student, seller, week, date,
--     status and payment status.
--
-- The student sees what was taken off: unavailable_lines on the new order
-- lists every removed line with its price, so their Orders tab can say
-- "Not available: 14 Frasaco" and the old and new totals.
--
-- Safe to run twice.

-- ── 1. Where a changed order came from, and what was taken off ────────

alter table public.orders
  add column if not exists amended_from uuid references public.orders (id);

alter table public.orders
  add column if not exists unavailable_lines jsonb not null default '[]'::jsonb;

comment on column public.orders.amended_from is
  'Set when a seller took unavailable lines off an order: the order this one replaced.';
comment on column public.orders.unavailable_lines is
  'Lines the seller took off as unavailable, each as it was charged: tooth_number, tooth_type, product_name, product_unit, quantity, unit_price, line_total.';

-- Neither column is in authenticated's update grant, and nobody but the
-- functions below inserts orders. They are written once, here.

-- ── 2. A replaced order may have been pending or confirmed ────────────
--
-- Same rules as before for everything else: a replaced order is frozen,
-- and replacing always cancels it in the same statement. A student's edit
-- still checks for pending itself.

create or replace function public.protect_order_replacement()
returns trigger
language plpgsql
as $$
begin
  if old.replaced_by is not null then
    if new.replaced_by       is distinct from old.replaced_by
    or new.fulfillment_status is distinct from old.fulfillment_status
    or new.payment_status    is distinct from old.payment_status
    then
      raise exception 'this order was edited and replaced; it can no longer be changed'
        using errcode = 'DT002';
    end if;
    return new;
  end if;

  if new.replaced_by is not null then
    if old.fulfillment_status::text not in ('pending', 'confirmed')
    or new.fulfillment_status::text <> 'cancelled' then
      raise exception 'only a pending or confirmed order can be replaced, and it must be cancelled when it is';
    end if;
  end if;

  return new;
end;
$$;

-- ── 3. A changed order keeps its week ─────────────────────────────────
--
-- New weekly orders are filed under the seller's current week. A changed
-- order is the same order, so it keeps the week it was placed for.

create or replace function public.set_order_week()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_type::text = 'tooth' and new.supplier_id is not null and new.amended_from is null then
    select public.effective_week(s.current_week, s.week_set_at)
      into new.week_number
    from public.suppliers s
    where s.id = new.supplier_id;
  end if;
  return new;
end;
$$;

-- ── 4. Taking lines off ───────────────────────────────────────────────

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
    amended_from, unavailable_lines
  )
  values (
    v_old.order_type, v_old.student_id, v_old.supplier_id, v_old.week_number,
    v_total, 0, 0, v_total,
    v_old.payment_status, v_old.fulfillment_status, v_old.notes, v_old.created_at,
    v_old.id, v_removed
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
