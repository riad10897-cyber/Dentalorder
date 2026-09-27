-- ═══════════════════════════════════════════════════════════════════
-- A student can cancel their own order while it is still pending
-- ═══════════════════════════════════════════════════════════════════
--
-- Students could edit a pending order but not withdraw it: an edit must
-- keep at least one tooth, and students have no UPDATE rights on orders
-- at all — only the supplier does. A student who no longer wanted an order
-- had to message the supplier.
--
-- Cancelling is a status, not a delete. The order stays, with its lines
-- and prices, marked cancelled and stamped with when. The student sees it
-- under Finished; it drops out of the supplier's pending list and out of
-- every total, which already exclude cancelled orders.
--
-- Rules, enforced here:
--   - only the student who placed it;
--   - only while pending — once the supplier has confirmed, rejected or
--     handed it over, it is refused with DT002, like a late edit;
--   - an order already replaced by an edit cannot be cancelled (it is
--     already gone as far as anyone can see);
--   - once a student has cancelled, the order is frozen. A supplier whose
--     screen still shows it as pending and taps Confirm is refused, rather
--     than quietly reviving an order the student withdrew.

alter table public.orders
  add column if not exists cancelled_at timestamptz;

comment on column public.orders.cancelled_at is
  'Set when the student cancels a pending order. A cancelled-by-student order is frozen.';

create or replace function public.protect_order_cancellation()
returns trigger
language plpgsql
as $$
begin
  if old.cancelled_at is not null then
    if new.cancelled_at       is distinct from old.cancelled_at
    or new.fulfillment_status is distinct from old.fulfillment_status
    or new.payment_status     is distinct from old.payment_status
    then
      raise exception 'the student cancelled this order; it can no longer be changed'
        using errcode = 'DT002';
    end if;
    return new;
  end if;

  if new.cancelled_at is not null then
    if old.fulfillment_status::text <> 'pending'
    or new.fulfillment_status::text <> 'cancelled' then
      raise exception 'only a pending order can be cancelled by the student, and it must be marked cancelled when it is';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_protect_cancellation on public.orders;
create trigger orders_protect_cancellation
  before update on public.orders
  for each row execute function public.protect_order_cancellation();

-- cancelled_at is deliberately not in authenticated's column grant. The
-- function below is the only way a student or supplier can set it.

create or replace function public.cancel_pending_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_old     public.orders%rowtype;
begin
  if v_student is null then
    raise exception 'must be signed in';
  end if;

  -- Locked, so a supplier confirming at the same moment waits for this
  -- and then finds the order cancelled — or wins, and this finds it
  -- confirmed and refuses.
  select * into v_old from public.orders where id = p_order_id for update;

  if not found or v_old.student_id <> v_student or v_old.replaced_by is not null then
    raise exception 'order not found';
  end if;
  if v_old.order_type::text <> 'tooth' then
    raise exception 'only a tooth order can be cancelled here';
  end if;
  if v_old.fulfillment_status::text = 'cancelled' then
    raise exception 'this order is already cancelled' using errcode = 'DT002';
  end if;
  if v_old.fulfillment_status::text <> 'pending' then
    raise exception 'this order can no longer be cancelled — the supplier has already %',
      case v_old.fulfillment_status::text
        when 'confirmed' then 'confirmed it'
        when 'fulfilled' then 'handed it over'
        when 'rejected'  then 'rejected it'
        else 'moved it on'
      end
      using errcode = 'DT002';
  end if;

  update public.orders
     set fulfillment_status = 'cancelled',
         cancelled_at       = now()
   where id = p_order_id;
end;
$$;

revoke all on function public.cancel_pending_order(uuid) from public;
revoke all on function public.cancel_pending_order(uuid) from anon;
grant execute on function public.cancel_pending_order(uuid) to authenticated;
