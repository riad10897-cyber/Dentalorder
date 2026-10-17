-- Rehearsal for 20260119000000_seller_removes_unavailable.sql.
-- Run on a scratch database built from schema-full.sql plus that
-- migration. Prints PASS/FAIL per check and a count.
\set QUIET on
\pset tuples_only on
\pset format unaligned
set client_min_messages = warning;
create schema t; grant usage on schema t to authenticated;
insert into auth.users (email, raw_user_meta_data) values
 ('maria@x.com','{"full_name":"Maria"}'::jsonb),
 ('other@x.com','{"full_name":"Other seller"}'::jsonb),
 ('a@x.com','{"full_name":"A","university":"BAU"}'::jsonb),
 ('b@x.com','{"full_name":"B","university":"BAU"}'::jsonb);
insert into public.suppliers (id, kind, display_name, business_name, contact_phone)
select id, 'shop', email, email, '1' from auth.users where email in ('maria@x.com','other@x.com')
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
 $$ insert into t.out(line) values ((case when coalesce(ok,false) then 'PASS' else 'FAIL' end) || '  ' || name || coalesce('  — ' || detail, '')) $$;
create function t.try(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlstate || ': ' || sqlerrm; end $$;
create function t.line(o uuid, tooth int) returns uuid language sql security definer as
 $$ select id from public.order_items where order_id=o and tooth_number=tooth $$;
create function t.lines(o uuid) returns text language sql security definer as
 $$ select string_agg(tooth_number || ':' || tooth_type || 'x' || quantity || '@' || unit_price || '=' || line_total, ' ' order by tooth_number)
    from public.order_items where order_id=o $$;
-- 14 Frasaco x1, 36 Copy A x2, 47 Frasaco x1 at 2.50 / 1.20: 7.40.
create function t.order_for(e text) returns uuid language plpgsql as $$
begin perform t.act(e); return public.submit_tooth_order(t.uid('maria@x.com'), 1::smallint,
  '[{"tooth_number":14,"tooth_type":"frasaco","quantity":1},{"tooth_number":36,"tooth_type":"copy_a","quantity":2},{"tooth_number":47,"tooth_type":"frasaco","quantity":1}]'::jsonb, 7.40); end $$;
grant execute on all functions in schema t to authenticated;

update public.suppliers set current_week = 4 where id = t.uid('maria@x.com');

set role authenticated;
select t.put('o1', t.order_for('a@x.com')::text);
select t.put('o2', t.order_for('a@x.com')::text);
select t.put('o3', t.order_for('a@x.com')::text);
select t.put('ob', t.order_for('b@x.com')::text);
reset role;

-- Maria confirms o1 and o3 and marks o3 paid; o2 stays pending.
select t.act('maria@x.com'); set role authenticated;
update public.orders set fulfillment_status='confirmed' where id in (t.get('o1'), t.get('o3'));
update public.orders set payment_status='paid' where id = t.get('o3');
reset role;

-- Then her prices go up, and the week moves on.
update public.suppliers set frasaco_price = 3.00, copy_a_price = 2.00, current_week = 6
 where id = t.uid('maria@x.com');
select t.put('o1_created', (select created_at::text from orders where id=t.get('o1')));

-- 1. Maria takes 14 off the confirmed order
select t.act('maria@x.com'); set role authenticated;
select t.put('n1', public.remove_unavailable_lines(t.get('o1'), array[t.line(t.get('o1'), 14)])::text);
reset role;
select t.check('new total is the lines that stay, at the prices first charged: 2x1.20 + 2.50 = 4.90',
  (select total_price = 4.90 and subtotal = 4.90 and commission_amount = 0 from orders where id=t.get('n1')),
  (select total_price::text from orders where id=t.get('n1')));
select t.check('remaining lines copied exactly, not repriced',
  t.lines(t.get('n1')) = '36:copy_ax2@1.20=2.40 47:frasacox1@2.50=2.50', t.lines(t.get('n1')));
select t.check('still confirmed, same student, seller, week and date',
  (select fulfillment_status::text='confirmed' and student_id=t.uid('a@x.com') and supplier_id=t.uid('maria@x.com')
          and week_number=4 and created_at::text=t.val('o1_created') and amended_from=t.get('o1') from orders where id=t.get('n1')),
  (select 'week ' || week_number from orders where id=t.get('n1')));
select t.check('what was taken off is recorded, as charged',
  (select unavailable_lines = '[{"quantity":1,"line_total":2.50,"tooth_type":"frasaco","unit_price":2.50,"product_name":null,"product_unit":null,"tooth_number":14}]'::jsonb
   from orders where id=t.get('n1')),
  (select unavailable_lines::text from orders where id=t.get('n1')));
select t.check('the original order is untouched: $7.40, all 3 lines, cancelled and pointing at the new one',
  (select total_price=7.40 and fulfillment_status::text='cancelled' and replaced_by=t.get('n1') from orders where id=t.get('o1'))
  and t.lines(t.get('o1')) = '14:frasacox1@2.50=2.50 36:copy_ax2@1.20=2.40 47:frasacox1@2.50=2.50', t.lines(t.get('o1')));

-- 2. both sides see one order: the new one
select t.act('a@x.com'); set role authenticated;
select t.put('a_sees', (select string_agg(id::text, ',') from orders where id in (t.get('o1'), t.get('n1'))));
select t.put('a_lines', (select count(*)::text from order_items where order_id in (t.get('o1'), t.get('n1'))));
select t.put('a_note', (select unavailable_lines->0->>'tooth_number' from orders where id=t.get('n1')));
reset role;
select t.act('maria@x.com'); set role authenticated;
select t.put('m_sees', (select string_agg(id::text, ',') from orders where id in (t.get('o1'), t.get('n1'))));
reset role;
select t.check('the student sees the new order only, with its 2 lines', t.val('a_sees')=t.val('n1') and t.val('a_lines')='2', t.val('a_lines'));
select t.check('the student can read what was taken off', t.val('a_note')='14', t.val('a_note'));
select t.check('the seller sees the new order only', t.val('m_sees')=t.val('n1'), null);

-- 3. and again: 47 off the new order
select t.act('maria@x.com'); set role authenticated;
select t.put('n2', public.remove_unavailable_lines(t.get('n1'), array[t.line(t.get('n1'), 47)])::text);
reset role;
select t.check('a second removal: $2.40, and both removed lines listed',
  (select total_price=2.40 and jsonb_array_length(unavailable_lines)=2 and week_number=4 from orders where id=t.get('n2')),
  (select total_price::text || ' / ' || jsonb_array_length(unavailable_lines) from orders where id=t.get('n2')));

-- 4. refusals
select t.act('maria@x.com'); set role authenticated;
select t.put('last', t.try($$select public.remove_unavailable_lines(t.get('n2'), array[t.line(t.get('n2'), 36)])$$));
select t.put('old', t.try($$select public.remove_unavailable_lines(t.get('o1'), array[t.line(t.get('o1'), 36)])$$));
select t.put('foreign', t.try($$select public.remove_unavailable_lines(t.get('o2'), array[t.line(t.get('ob'), 14)])$$));
select t.put('none', t.try($$select public.remove_unavailable_lines(t.get('o2'), array[]::uuid[])$$));
reset role;
select t.check('the last line cannot be taken off', t.val('last') like 'DT004%' and (select fulfillment_status::text='confirmed' from orders where id=t.get('n2')), t.val('last'));
select t.check('an order already replaced cannot be changed', t.val('old') like '%order not found%', t.val('old'));
select t.check('a line from another order is refused', t.val('foreign') like '%not on this order%', t.val('foreign'));
select t.check('taking off nothing is refused', t.val('none') like '%at least one%', t.val('none'));

select t.act('other@x.com'); set role authenticated;
select t.put('other', t.try($$select public.remove_unavailable_lines(t.get('o2'), array[t.line(t.get('o2'), 14)])$$));
reset role;
select t.act('a@x.com'); set role authenticated;
select t.put('student', t.try($$select public.remove_unavailable_lines(t.get('o2'), array[t.line(t.get('o2'), 14)])$$));
reset role;
select t.check('another seller cannot', t.val('other') like '%order not found%', t.val('other'));
select t.check('the student cannot', t.val('student') like '%order not found%', t.val('student'));
select t.check('o2 is still whole after all that', t.lines(t.get('o2')) = '14:frasacox1@2.50=2.50 36:copy_ax2@1.20=2.40 47:frasacox1@2.50=2.50'
  and (select replaced_by is null and fulfillment_status::text='pending' from orders where id=t.get('o2')), null);

update orders set fulfillment_status='fulfilled' where id=t.get('o3');
select t.act('maria@x.com'); set role authenticated;
select t.put('handed', t.try($$select public.remove_unavailable_lines(t.get('o3'), array[t.line(t.get('o3'), 14)])$$));
reset role;
select t.check('once handed over, it cannot be changed', t.val('handed') like 'DT002%', t.val('handed'));

-- 5. a pending order stays pending, and the student can still edit it
select t.act('maria@x.com'); set role authenticated;
select t.put('n3', public.remove_unavailable_lines(t.get('o2'), array[t.line(t.get('o2'), 14), t.line(t.get('o2'), 14)])::text);
reset role;
select t.check('pending stays pending; a repeated id counts once: $4.90',
  (select fulfillment_status::text='pending' and total_price=4.90 from orders where id=t.get('n3')), null);
select t.act('a@x.com'); set role authenticated;
select t.put('edit', t.try($$select public.edit_pending_order(t.get('n3'), '[{"tooth_number":21,"tooth_type":"frasaco","quantity":1}]'::jsonb, 3.00)$$));
reset role;
select t.check('the student can still edit it, at today''s prices', t.val('edit')='ok', t.val('edit'));

-- 6. payment status carries over
update orders set fulfillment_status='confirmed' where id=t.get('o3');
select t.act('maria@x.com'); set role authenticated;
select t.put('n4', t.try($$select t.put('n4id', public.remove_unavailable_lines(t.get('o3'), array[t.line(t.get('o3'), 47)])::text)$$));
reset role;
select t.check('a paid order stays paid', (select payment_status::text='paid' and total_price=4.90 from orders where id=t.get('n4id')), t.val('n4'));

-- 7. the money columns are still closed to the API
select t.act('maria@x.com'); set role authenticated;
select t.put('hand_total', t.try($$update public.orders set total_price=1 where id=t.get('n2')$$));
select t.put('hand_lines', t.try($$update public.orders set unavailable_lines='[]' where id=t.get('n2')$$));
select t.put('hand_from', t.try($$update public.orders set amended_from=null where id=t.get('n2')$$));
reset role;
select t.check('the seller cannot set a total by hand', (select total_price=2.40 from orders where id=t.get('n2')), t.val('hand_total'));
select t.check('nor rewrite what was taken off, nor where it came from',
  (select jsonb_array_length(unavailable_lines)=2 and amended_from=t.get('n1') from orders where id=t.get('n2')),
  t.val('hand_lines') || ' / ' || t.val('hand_from'));

-- 8. an ordinary new order still goes into the seller's current week
select t.act('b@x.com'); set role authenticated;
select t.put('fresh', public.submit_tooth_order(t.uid('maria@x.com'), 1::smallint, '[{"tooth_number":11,"tooth_type":"frasaco","quantity":1}]'::jsonb, 3.00)::text);
reset role;
select t.check('a new order is still filed under the current week', (select week_number=6 from orders where id=t.get('fresh')), null);

select line from t.out order by n;
select (select count(*) from t.out where line like 'PASS%') || '/' || (select count(*) from t.out) || ' passed';
