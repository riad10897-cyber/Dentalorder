-- Phase 1: a supplier can reject a pending order, and say why.
--
-- Until now a supplier's only options were to confirm or to fulfil. An
-- order they could not supply — wrong teeth, out of stock, student never
-- turned up — had nowhere to go, so it sat pending forever, stayed in the
-- weekly batch the supplier buys against, and left the student with no idea
-- anything was wrong.
--
-- 'rejected' is a fulfilment outcome, not a payment one, so it belongs on
-- fulfillment_status. It is deliberately distinct from 'cancelled':
-- cancelled is for a student or an admin withdrawing an order, rejected is
-- the supplier refusing it. Collapsing them would lose who did it.

alter type fulfillment_status add value if not exists 'rejected';

alter table orders add column if not exists rejection_reason text;

comment on column orders.rejection_reason is
  'Why the supplier rejected the order. Shown to the student. Only ever set together with fulfillment_status = rejected.';

-- A3 narrowed the rep to two updatable columns; rejecting needs to write
-- the reason alongside the status, so the grant is restated with all three.
-- Revoke first: a grant cannot narrow what is already held.
revoke update on public.orders from anon, authenticated;
grant update (fulfillment_status, payment_status, rejection_reason) on public.orders to authenticated;

-- The rules about rejection live here rather than only in the server
-- action, so they hold whatever calls the API.
--
-- The comparisons are `::text` on purpose. Postgres will not let a new enum
-- value be *used* in the same transaction that adds it, and the Supabase SQL
-- Editor may run this whole file as one. Comparing the cast text sidesteps
-- that without weakening the check.
create or replace function public.protect_order_rejection()
returns trigger
language plpgsql
as $$
begin
  if new.fulfillment_status::text = 'rejected'
     and old.fulfillment_status::text is distinct from 'rejected' then
    if old.fulfillment_status::text <> 'pending' then
      raise exception 'only a pending order can be rejected (this one is %)', old.fulfillment_status;
    end if;
    if coalesce(btrim(new.rejection_reason), '') = '' then
      raise exception 'a rejected order must say why';
    end if;
  end if;

  -- The reason belongs to the rejection. It cannot be attached to an order
  -- that is not rejected, and it cannot be quietly edited afterwards.
  if new.fulfillment_status::text <> 'rejected'
     and coalesce(btrim(new.rejection_reason), '') <> '' then
    raise exception 'rejection_reason can only be set on a rejected order';
  end if;

  if old.fulfillment_status::text = 'rejected'
     and new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'a rejection reason cannot be changed after the fact';
  end if;

  return new;
end;
$$;

create trigger orders_protect_rejection
  before update on orders
  for each row execute function public.protect_order_rejection();
