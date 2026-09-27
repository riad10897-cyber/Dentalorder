-- ═══════════════════════════════════════════════════════════════════
-- PHASE 5 — run in BOTH projects: production and test. Either order.
-- ═══════════════════════════════════════════════════════════════════
--
-- Adds editing a pending order. Changes no existing row: it adds one
-- empty column, one trigger, one function, and tightens three policies
-- so an edited-away order is hidden from both sides.
--
-- The app code that uses it is NOT deployed yet. This SQL is safe to run
-- ahead of it — today's app never sets the new column, so nothing it
-- shows or does changes. Tell me when it is in, and I push the code.
--
-- Rehearsed on a fresh copy of the full schema, 18 checks, all passing:
-- the edit reprices at current prices, keeps supplier and week, keeps the
-- old order with its old lines untouched, hides it from student and
-- supplier, refuses a stale total, refuses once confirmed, refuses another
-- student, and a replaced order cannot be revived even by the superuser.

-- ═══════════════════════════════════════════════════════════════════
-- Phase 5: a student can edit an order while it is still pending
-- ═══════════════════════════════════════════════════════════════════
--
-- An order and its lines can never be changed in place — that is the rule
-- the whole pricing design rests on, and the last migration closed it for
-- every role. So an edit is a swap, done in one transaction:
--
--   1. the new selection is placed as a fresh order, through
--      submit_tooth_order — the same pricing path every order takes, so
--      it is priced at the supplier's CURRENT prices (an edit is a new
--      quote);
--   2. the old order is marked cancelled and pointed at its replacement.
--
-- Nothing is deleted. The old order stays in the database, with its own
-- lines and its own prices, as the record of what was first asked for.
-- It is hidden from the student and the supplier, because to them there
-- is one order and it has changed.
--
-- Rules, all enforced here rather than trusted to the app:
--   - only the student who placed it can edit it;
--   - only while it is pending. Once the supplier has confirmed, rejected
--     or handed it over, the edit is refused;
--   - same supplier, same week — they are read from the old order, never
--     taken from the request;
--   - an order can be replaced once. The replacement is itself pending
--     and can be edited in turn, which replaces it.
--
-- The race: the old order is locked for the length of the edit. If the
-- supplier confirms first, the edit sees "confirmed" and is refused. If
-- the edit lands first, the supplier's confirm hits an order that is
-- already cancelled and replaced — and is refused by the trigger below,
-- rather than quietly confirming an order nobody can see.

-- ── 1. Where an order went when it was edited ─────────────────────────

alter table public.orders
  add column if not exists replaced_by uuid references public.orders (id);

create index if not exists orders_replaced_by_idx
  on public.orders (replaced_by) where replaced_by is not null;

comment on column public.orders.replaced_by is
  'Set when a student edits a pending order: the order that took its place. A replaced order is cancelled, frozen, and hidden from the student and the supplier.';

-- ── 2. A replaced order is frozen ─────────────────────────────────────

create or replace function public.protect_order_replacement()
returns trigger
language plpgsql
as $$
begin
  -- Nothing about a replaced order may change afterwards: not its status
  -- (a late "confirm" must not revive it), not its payment, and not where
  -- it points.
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

  -- Replacing is only ever pending -> cancelled, in the same statement.
  if new.replaced_by is not null then
    if old.fulfillment_status::text <> 'pending'
    or new.fulfillment_status::text <> 'cancelled' then
      raise exception 'only a pending order can be replaced, and it must be cancelled when it is';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_protect_replacement on public.orders;
create trigger orders_protect_replacement
  before update on public.orders
  for each row execute function public.protect_order_replacement();

-- replaced_by is deliberately NOT added to authenticated's column grant.
-- Students and suppliers can only reach it through the function below.

-- ── 3. Hidden from both sides ─────────────────────────────────────────
--
-- order_items_select reads orders through these policies, so the old
-- order's lines disappear with it. Admins still see everything.

drop policy if exists orders_select_student on public.orders;
create policy orders_select_student on public.orders
  for select using (student_id = auth.uid() and replaced_by is null);

drop policy if exists orders_select_supplier on public.orders;
create policy orders_select_supplier on public.orders
  for select using (supplier_id = auth.uid() and replaced_by is null);

drop policy if exists orders_update_supplier on public.orders;
create policy orders_update_supplier on public.orders
  for update using (supplier_id = auth.uid() and replaced_by is null)
  with check (supplier_id = auth.uid());

-- ── 4. The edit ───────────────────────────────────────────────────────
--
-- p_expected_total is the total the student was shown on the review
-- screen. If the supplier changes prices between that screen and the tap,
-- the edit is refused with DT001 and the new total, so the app can show
-- "prices changed" and ask again — a total the student never saw is never
-- charged. Pass null to skip the check.

create or replace function public.edit_pending_order(
  p_order_id       uuid,
  p_items          jsonb,
  p_expected_total numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_old     public.orders%rowtype;
  v_new     uuid;
  v_total   numeric(10,2);
begin
  if v_student is null then
    raise exception 'must be signed in';
  end if;

  select * into v_old from public.orders where id = p_order_id for update;

  -- "Not found" for someone else's order too: no hint that it exists.
  if not found or v_old.student_id <> v_student then
    raise exception 'order not found';
  end if;
  if v_old.order_type::text <> 'tooth' then
    raise exception 'only a tooth order can be edited';
  end if;
  if v_old.replaced_by is not null then
    raise exception 'this order has already been edited' using errcode = 'DT002';
  end if;
  if v_old.fulfillment_status::text <> 'pending' then
    raise exception 'this order can no longer be edited — the supplier has already %',
      case v_old.fulfillment_status::text
        when 'confirmed' then 'confirmed it'
        when 'fulfilled' then 'handed it over'
        when 'rejected'  then 'rejected it'
        when 'cancelled' then 'had it cancelled'
        else 'moved it on'
      end
      using errcode = 'DT002';
  end if;

  -- Same supplier, same week, from the old order. Priced now.
  v_new := public.submit_tooth_order(v_old.supplier_id, v_old.week_number, p_items);

  select total_price into v_total from public.orders where id = v_new;
  if p_expected_total is not null and v_total <> p_expected_total then
    -- Raising rolls the new order back with everything else.
    raise exception 'prices changed: the total is now %', v_total
      using errcode = 'DT001', detail = v_total::text;
  end if;

  update public.orders
     set fulfillment_status = 'cancelled',
         replaced_by        = v_new
   where id = p_order_id;

  return v_new;
end;
$$;

revoke all on function public.edit_pending_order(uuid, jsonb, numeric) from public;
revoke all on function public.edit_pending_order(uuid, jsonb, numeric) from anon;
grant execute on function public.edit_pending_order(uuid, jsonb, numeric) to authenticated;
