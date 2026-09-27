-- ═══════════════════════════════════════════════════════════════════
-- A new order is charged what the screen said, or refused
-- ═══════════════════════════════════════════════════════════════════
--
-- Phase 5 gave an edit this protection; an ordinary order did not have
-- it. submit_tooth_order has always priced from the supplier's current
-- prices, which is right, but nothing checked those were the prices the
-- student had just been shown. If a supplier changed prices while a
-- student was on the chart, the student was charged a total they never
-- saw. Until today a price change in Settings also left the market
-- showing the old price for up to five minutes, which made it likely
-- rather than rare.
--
-- The function now takes the total the student was shown. If the real
-- total differs, it refuses with DT001 — the same code the edit uses —
-- and the new total, and writes nothing. The app tells the student the
-- price changed and lets them confirm the new figure.
--
-- p_expected_total defaults to null, meaning "no check". That is what
-- keeps the app that is deployed right now working the moment this runs:
-- it calls with three named arguments, which resolve to this function
-- with the default. The new app always passes the fourth.
--
-- The three-argument version is dropped rather than kept beside this
-- one: two overloads that both accept three named arguments would be
-- ambiguous, and PostgREST would refuse to choose.

drop function if exists public.submit_tooth_order(uuid, smallint, jsonb);

create or replace function public.submit_tooth_order(
  p_supplier_id    uuid,
  p_week_number    smallint,
  p_items          jsonb,
  p_expected_total numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id    uuid := auth.uid();
  v_frasaco_price numeric(10,2);
  v_copy_a_price  numeric(10,2);
  v_status        account_status;
  v_order_id      uuid;
  v_item          jsonb;
  v_quantity      integer;
  v_tooth_number  smallint;
  v_tooth_type    tooth_type;
  v_unit_price    numeric(10,2);
  v_subtotal      numeric(10,2) := 0;
  v_seen          text[] := '{}';
  v_key           text;
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

  if jsonb_array_length(p_items) > 64 then
    raise exception 'an order cannot have more than 64 lines';
  end if;

  select frasaco_price, copy_a_price, status
    into v_frasaco_price, v_copy_a_price, v_status
  from suppliers where id = p_supplier_id;

  if v_frasaco_price is null then
    raise exception 'no such supplier';
  end if;
  if v_status <> 'active' then
    raise exception 'that supplier is not taking orders';
  end if;
  if p_supplier_id = v_student_id then
    raise exception 'you cannot order from yourself';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity     := (v_item->>'quantity')::integer;
    v_tooth_number := (v_item->>'tooth_number')::smallint;
    v_tooth_type   := (v_item->>'tooth_type')::tooth_type;

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

    v_key := v_tooth_number || ':' || v_tooth_type;
    if v_key = any (v_seen) then
      raise exception 'tooth % appears twice as the same type in one order', v_tooth_number;
    end if;
    v_seen := v_seen || v_key;

    v_unit_price := case when v_tooth_type = 'frasaco' then v_frasaco_price else v_copy_a_price end;
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  end loop;

  -- The student is charged what their screen said, or told it changed.
  -- Checked before anything is written, so a refusal leaves no trace.
  if p_expected_total is not null
     and round(p_expected_total, 2) <> v_subtotal then
    raise exception 'prices changed: the total is now %', v_subtotal
      using errcode = 'DT001', detail = v_subtotal::text;
  end if;

  insert into orders (order_type, student_id, supplier_id, week_number, subtotal, total_price)
  values ('tooth', v_student_id, p_supplier_id, p_week_number, v_subtotal, v_subtotal)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity     := (v_item->>'quantity')::integer;
    v_tooth_number := (v_item->>'tooth_number')::smallint;
    v_tooth_type   := (v_item->>'tooth_type')::tooth_type;
    v_unit_price   := case when v_tooth_type = 'frasaco' then v_frasaco_price else v_copy_a_price end;

    insert into order_items (order_id, tooth_number, tooth_type, quantity, unit_price, line_total)
    values (v_order_id, v_tooth_number, v_tooth_type, v_quantity, v_unit_price, v_unit_price * v_quantity);
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.submit_tooth_order(uuid, smallint, jsonb, numeric) from public;
revoke all on function public.submit_tooth_order(uuid, smallint, jsonb, numeric) from anon;
grant execute on function public.submit_tooth_order(uuid, smallint, jsonb, numeric) to authenticated;
