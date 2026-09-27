\set QUIET on
\pset tuples_only on
\pset format unaligned
set client_min_messages = warning;
create schema t; grant usage on schema t to authenticated;
insert into auth.users (email, raw_user_meta_data) values
 ('shop@x.com','{"role":"supplier","full_name":"Shop","business_name":"Shop","contact_phone":"1"}'::jsonb),
 ('a@x.com','{"role":"student","full_name":"A","university":"BAU"}'::jsonb),
 ('b@x.com','{"role":"student","full_name":"B","university":"BAU"}'::jsonb);
-- Sign-up makes students only; a supplier is a row added by hand.
insert into public.suppliers (id, kind, display_name, business_name, contact_phone)
select id, 'shop', 'Shop', 'Shop', '1' from auth.users where email = 'shop@x.com'
on conflict (id) do nothing;
update public.suppliers set status='active';
create table t.v(k text primary key, v text); grant all on t.v to authenticated;
create table t.out(n serial, line text); grant all on t.out, t.out_n_seq to authenticated;
create function t.uid(e text) returns uuid language sql security definer as $$ select id from auth.users where email=e $$;
create function t.act(e text) returns void language sql as $$ select set_config('request.jwt.claim.sub', t.uid(e)::text, false) $$;
create function t.put(k text, v text) returns void language sql security definer as $$ insert into t.v values (k,v) on conflict (k) do update set v=excluded.v $$;
create function t.get(k text) returns uuid language sql security definer as $$ select v::uuid from t.v where t.v.k=$1 $$;
create function t.val(k text) returns text language sql security definer as $$ select v from t.v where t.v.k=$1 $$;
create function t.check(name text, ok boolean, detail text) returns void language sql as
 $$ insert into t.out(line) values ((case when ok then 'PASS' else 'FAIL' end) || '  ' || name || coalesce('  — ' || detail, '')) $$;
create function t.try(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlstate || ': ' || sqlerrm; end $$;
grant execute on all functions in schema t to authenticated;
create function t.st(o uuid) returns text language sql security definer as $$ select fulfillment_status::text from public.orders where id=o $$;
create function t.order_for(e text, wk int) returns uuid language plpgsql as $$
begin perform t.act(e); return public.submit_tooth_order(t.uid('shop@x.com'), wk::smallint,
  '[{"tooth_number":11,"tooth_type":"frasaco","quantity":2},{"tooth_number":46,"tooth_type":"copy_a","quantity":1}]'::jsonb, 6.20); end $$;
grant execute on all functions in schema t to authenticated;

set role authenticated;
select t.put('o1', t.order_for('a@x.com',5)::text);
select t.put('o2', t.order_for('a@x.com',6)::text);
select t.put('o3', t.order_for('a@x.com',7)::text);
select t.put('o4', t.order_for('a@x.com',8)::text);
select t.put('o5', t.order_for('a@x.com',9)::text);
reset role;

-- 1. A cancels their own pending order
select t.act('a@x.com'); set role authenticated;
select t.put('c1', t.try($$select public.cancel_pending_order(t.get('o1'))$$));
reset role;
select t.check('student cancels their own pending order',
  (select fulfillment_status::text='cancelled' and cancelled_at is not null from orders where id=t.get('o1')), t.val('c1'));
select t.check('money and lines untouched: $6.20, 2 lines at 2.50 and 1.20',
  (select total_price=6.20 from orders where id=t.get('o1'))
  and (select string_agg(unit_price::text, ',' order by unit_price) from order_items where order_id=t.get('o1'))='1.20,2.50', null);

-- 2. still visible to both, as cancelled — kept, not erased
select t.act('a@x.com'); set role authenticated;
select t.put('a_sees', (select fulfillment_status::text from orders where id=t.get('o1')));
reset role;
select t.act('shop@x.com'); set role authenticated;
select t.put('s_sees', (select fulfillment_status::text from orders where id=t.get('o1')));
reset role;
select t.check('student still sees it, as cancelled', t.val('a_sees')='cancelled', t.val('a_sees'));
select t.check('supplier sees it as cancelled, not pending', t.val('s_sees')='cancelled', t.val('s_sees'));

-- 3. the stale Confirm
select t.act('shop@x.com'); set role authenticated;
select t.put('late', t.try($$update public.orders set fulfillment_status='confirmed' where id=t.get('o1')$$));
reset role;
select t.check('a supplier''s late Confirm cannot revive it', t.st(t.get('o1'))='cancelled', t.val('late'));
select t.put('late_su', t.try($$update public.orders set fulfillment_status='pending' where id=t.get('o1')$$));
select t.check('nor can the superuser', t.st(t.get('o1'))='cancelled', t.val('late_su'));

-- 4. another student
select t.act('b@x.com'); set role authenticated;
select t.put('b', t.try($$select public.cancel_pending_order(t.get('o2'))$$));
reset role;
select t.check('another student cannot cancel it', t.st(t.get('o2'))='pending', t.val('b'));

-- 5. the supplier cannot use the student's function on it either
select t.act('shop@x.com'); set role authenticated;
select t.put('s', t.try($$select public.cancel_pending_order(t.get('o2'))$$));
reset role;
select t.check('the supplier cannot cancel on the student''s behalf', t.st(t.get('o2'))='pending', t.val('s'));

-- 6. confirmed first
update orders set fulfillment_status='confirmed' where id=t.get('o3');
select t.act('a@x.com'); set role authenticated;
select t.put('conf', t.try($$select public.cancel_pending_order(t.get('o3'))$$));
reset role;
select t.check('once confirmed, the student cannot cancel', t.st(t.get('o3'))='confirmed', t.val('conf'));

-- 7. cancelling twice, editing a cancelled order
select t.act('a@x.com'); set role authenticated;
select t.put('twice', t.try($$select public.cancel_pending_order(t.get('o1'))$$));
select t.put('edit', t.try($$select public.edit_pending_order(t.get('o1'), '[{"tooth_number":21,"tooth_type":"frasaco","quantity":1}]'::jsonb, 2.50)$$));
reset role;
select t.check('cancelling twice is refused', t.val('twice') like 'DT002%', t.val('twice'));
select t.check('a cancelled order cannot be edited', t.val('edit') like 'DT002%' and (select count(*) from orders)=5, t.val('edit'));

-- 8. an order replaced by an edit
select t.act('a@x.com'); set role authenticated;
select t.put('e4', public.edit_pending_order(t.get('o4'), '[{"tooth_number":21,"tooth_type":"frasaco","quantity":1}]'::jsonb, 2.50)::text);
select t.put('rep', t.try($$select public.cancel_pending_order(t.get('o4'))$$));
select t.put('cnew', t.try($$select public.cancel_pending_order(t.get('e4'))$$));
reset role;
select t.check('an order already replaced by an edit cannot be cancelled', (select cancelled_at is null from orders where id=t.get('o4')), t.val('rep'));
select t.check('but its replacement can', t.st(t.get('e4'))='cancelled', t.val('cnew'));

-- 9. nobody sets cancelled_at by hand through the API
select t.act('shop@x.com'); set role authenticated;
select t.put('hand', t.try($$update public.orders set cancelled_at=now() where id=t.get('o5')$$));
reset role;
select t.check('cancelled_at cannot be written through the API', (select cancelled_at is null from orders where id=t.get('o5')), t.val('hand'));

-- 10. the supplier's ordinary flow is untouched
select t.act('shop@x.com'); set role authenticated;
select t.put('flow', t.try($$update public.orders set fulfillment_status='confirmed' where id=t.get('o5')$$));
select t.put('flow2', t.try($$update public.orders set fulfillment_status='fulfilled', payment_status='paid' where id=t.get('o5')$$));
reset role;
select t.check('a supplier still confirms, hands over and marks paid as before',
  (select fulfillment_status::text='fulfilled' and payment_status::text='paid' from orders where id=t.get('o5')), t.val('flow') || ' / ' || t.val('flow2'));

select line from t.out order by n;
select (select count(*) from t.out where line like 'PASS%') || '/' || (select count(*) from t.out) || ' passed';
