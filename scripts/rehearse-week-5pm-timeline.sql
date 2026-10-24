-- Rehearsal for 20260120000000_week_5pm_and_order_timeline.sql.
-- Run on a scratch database built from schema-full.sql (which includes it).
\set QUIET on
\pset tuples_only on
\pset format unaligned
set client_min_messages = warning;
create schema t; grant usage on schema t to authenticated;
insert into auth.users (email, raw_user_meta_data) values
 ('shop@x.com','{"full_name":"Shop"}'::jsonb),
 ('a@x.com','{"full_name":"A","university":"BAU"}'::jsonb);
insert into public.suppliers (id, kind, display_name, business_name, contact_phone)
select id, 'shop', 'Shop', 'Shop', '1' from auth.users where email = 'shop@x.com';
update public.suppliers set status='active';
create table t.v(k text primary key, v text); grant all on t.v to authenticated;
create table t.out(n serial, line text); grant all on t.out, t.out_n_seq to authenticated;
create function t.uid(e text) returns uuid language sql security definer as $$ select id from auth.users where email=e $$;
create function t.act(e text) returns void language sql as $$ select set_config('request.jwt.claim.sub', t.uid(e)::text, false) $$;
create function t.put(k text, v text) returns void language sql security definer as $$ insert into t.v values (k,v) on conflict (k) do update set v=excluded.v $$;
create function t.get(k text) returns uuid language sql security definer as $$ select v::uuid from t.v where t.v.k=$1 $$;
create function t.val(k text) returns text language sql security definer as $$ select v from t.v where t.v.k=$1 $$;
create function t.check(name text, ok boolean, detail text) returns void language sql as
 $$ insert into t.out(line) values ((case when coalesce(ok,false) then 'PASS' else 'FAIL' end) || '  ' || name || coalesce('  — ' || detail, '')) $$;
create function t.try(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlstate || ': ' || sqlerrm; end $$;
create function t.order_for(e text) returns uuid language plpgsql as $$
begin perform t.act(e); return public.submit_tooth_order(t.uid('shop@x.com'), 1::smallint,
  '[{"tooth_number":11,"tooth_type":"frasaco","quantity":2},{"tooth_number":46,"tooth_type":"copy_a","quantity":1}]'::jsonb, 6.20); end $$;
grant execute on all functions in schema t to authenticated;

-- 1. the week turns at Saturday 5:00 PM Beirut (UTC+3 on 24 Oct 2026)
select t.check('4:59 PM Saturday is still the old week, 5:00 PM is the new one',
  public.ordering_week_index('2026-10-24 13:59:00+00') + 1 = public.ordering_week_index('2026-10-24 14:00:00+00'), null);
select t.check('1:00 PM Saturday no longer starts a week',
  public.ordering_week_index('2026-10-24 09:59:00+00') = public.ordering_week_index('2026-10-24 10:01:00+00'), null);
select t.check('after the clocks change (7 Nov), 5:00 PM is 15:00 UTC',
  public.ordering_week_index('2026-11-07 14:59:00+00') + 1 = public.ordering_week_index('2026-11-07 15:00:00+00'),
  public.ordering_week_index('2026-11-07 14:59:00+00')::text || ' → ' || public.ordering_week_index('2026-11-07 15:00:00+00')::text);
select t.check('a seller''s week moves on once, at 5:00 PM',
  public.effective_week(5::smallint, '2026-10-20 09:00:00+00', '2026-10-24 13:59:00+00') = 5
  and public.effective_week(5::smallint, '2026-10-20 09:00:00+00', '2026-10-24 14:00:00+00') = 6, null);

-- 2. the timeline stamps itself
set role authenticated;
select t.put('o1', t.order_for('a@x.com')::text);
select t.put('o2', t.order_for('a@x.com')::text);
reset role;
select t.act('shop@x.com'); set role authenticated;
update orders set fulfillment_status='confirmed' where id=t.get('o1');
reset role;
select t.check('confirming stamps confirmed_at', (select confirmed_at is not null and fulfilled_at is null from orders where id=t.get('o1')), null);
select t.act('shop@x.com'); set role authenticated;
update orders set fulfillment_status='fulfilled' where id=t.get('o1');
update orders set payment_status='paid' where id=t.get('o1');
reset role;
select t.check('handing over and paid stamp their own times, confirmed is kept',
  (select confirmed_at is not null and fulfilled_at is not null and paid_at is not null from orders where id=t.get('o1')), null);
select t.act('shop@x.com'); set role authenticated;
update orders set fulfillment_status='confirmed' where id=t.get('o1');
update orders set payment_status='unpaid' where id=t.get('o1');
reset role;
select t.check('undoing hand-over and paid clears those times, keeps confirmed',
  (select confirmed_at is not null and fulfilled_at is null and paid_at is null from orders where id=t.get('o1')), null);
select t.act('shop@x.com'); set role authenticated;
update orders set fulfillment_status='pending' where id=t.get('o1');
reset role;
select t.check('undoing confirm clears confirmed_at', (select confirmed_at is null from orders where id=t.get('o1')), null);

-- 3. nobody writes the times by hand
select t.act('shop@x.com'); set role authenticated;
select t.put('hand', t.try($$update public.orders set confirmed_at = now() - interval '9 days' where id=t.get('o2')$$));
reset role;
select t.check('the seller cannot set a time through the API', (select confirmed_at is null from orders where id=t.get('o2')), t.val('hand'));
update orders set paid_at = '2020-01-01', fulfillment_status='confirmed' where id=t.get('o2');
select t.check('even the superuser''s made-up time is not kept; the real one is',
  (select paid_at is null and confirmed_at > now() - interval '1 minute' from orders where id=t.get('o2')), null);

-- 4. rejecting and taking items off
set role authenticated;
select t.put('o3', t.order_for('a@x.com')::text);
reset role;
select t.act('shop@x.com'); set role authenticated;
update orders set fulfillment_status='rejected', rejection_reason='Out this week' where id=t.get('o3');
select t.put('n2', public.remove_unavailable_lines(t.get('o2'), array[(select id from order_items where order_id=t.get('o2') and tooth_number=46)])::text);
reset role;
select t.check('rejecting stamps rejected_at', (select rejected_at is not null from orders where id=t.get('o3')), null);
select t.check('taking items off keeps confirmed_at and stamps amended_at, total 5.00',
  (select n.confirmed_at = o.confirmed_at and n.amended_at is not null and n.total_price = 5.00
     from orders n join orders o on o.id = n.amended_from where n.id=t.get('n2')), null);

select line from t.out order by n;
select (select count(*) from t.out where line like 'PASS%') || '/' || (select count(*) from t.out) || ' passed';
