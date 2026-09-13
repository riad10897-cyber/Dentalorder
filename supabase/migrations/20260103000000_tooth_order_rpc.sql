-- Phase 2: tooth order submission.
--
-- The Phase 1 orders_insert_student / order_items_insert policies only
-- checked student_id ownership — nothing stopped a crafted request from
-- POSTing directly to /rest/v1/orders with a fabricated subtotal or
-- total_price. That's exactly what "totals are computed server-side at
-- insert" (CLAUDE.md, spec §4) is supposed to prevent, and the existing
-- protective trigger only guards UPDATEs, not the initial INSERT.
--
-- Fix: tooth orders can now only be created through this function. It
-- looks up the caller's assigned rep and that rep's CURRENT prices,
-- computes every line and the subtotal itself, and is the only place
-- price ever gets written. The direct insert policies are dropped so
-- there is no other path in.

create or replace function public.submit_tooth_order(p_week_number smallint, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id   uuid := auth.uid();
  v_rep_id       uuid;
  v_frasaco_price numeric(10,2);
  v_copy_a_price  numeric(10,2);
  v_order_id      uuid;
  v_item          jsonb;
  v_quantity      integer;
  v_tooth_number  smallint;
  v_tooth_type    tooth_type;
  v_unit_price    numeric(10,2);
  v_subtotal      numeric(10,2) := 0;
begin
  if v_student_id is null then
    raise exception 'must be signed in';
  end if;

  if p_week_number is null or p_week_number < 1 or p_week_number > 17 then
    raise exception 'week_number must be between 1 and 17';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'order must have at least one item';
  end if;

  select rep_id into v_rep_id from student_reps where student_id = v_student_id;
  if v_rep_id is null then
    raise exception 'no representative assigned';
  end if;

  select frasaco_price, copy_a_price into v_frasaco_price, v_copy_a_price
  from representatives where id = v_rep_id;

  -- Validate every line and total the order before writing anything, so a
  -- bad line fails the whole submission instead of leaving a partial order.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    v_tooth_number := (v_item->>'tooth_number')::smallint;
    v_tooth_type := (v_item->>'tooth_type')::tooth_type;

    if v_quantity is null or v_quantity < 1 or v_quantity > 10 then
      raise exception 'quantity must be between 1 and 10';
    end if;
    if not (
      v_tooth_number between 11 and 18 or v_tooth_number between 21 and 28 or
      v_tooth_number between 31 and 38 or v_tooth_number between 41 and 48
    ) then
      raise exception 'invalid tooth number: %', v_tooth_number;
    end if;
    if v_tooth_type is null then
      raise exception 'tooth_type is required';
    end if;

    v_unit_price := case when v_tooth_type = 'frasaco' then v_frasaco_price else v_copy_a_price end;
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  insert into orders (order_type, student_id, rep_id, week_number, subtotal, total_price)
  values ('tooth', v_student_id, v_rep_id, p_week_number, v_subtotal, v_subtotal)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    v_tooth_number := (v_item->>'tooth_number')::smallint;
    v_tooth_type := (v_item->>'tooth_type')::tooth_type;
    v_unit_price := case when v_tooth_type = 'frasaco' then v_frasaco_price else v_copy_a_price end;

    insert into order_items (order_id, tooth_number, tooth_type, quantity, unit_price, line_total)
    values (v_order_id, v_tooth_number, v_tooth_type, v_quantity, v_unit_price, v_unit_price * v_quantity);
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.submit_tooth_order(smallint, jsonb) from public;
grant execute on function public.submit_tooth_order(smallint, jsonb) to authenticated;

drop policy if exists orders_insert_student on orders;
drop policy if exists order_items_insert on order_items;
