\set QUIET on
\pset tuples_only on
\pset format unaligned
set client_min_messages = warning;
create schema t;
grant usage on schema t to authenticated;
create table t.ids as select
  (select 1)::int as one;
insert into auth.users (email, raw_user_meta_data) values
 ('shop@x.com','{"role":"supplier","full_name":"Shop","business_name":"Shop","contact_phone":"1"}'::jsonb),
 ('a@x.com','{"role":"student","full_name":"Student A","university":"BAU"}'::jsonb),
 ('b@x.com','{"role":"student","full_name":"Student B","university":"BAU"}'::jsonb);
update public.suppliers set status='active';
create table t.v(k text primary key, v text);
grant all on t.v to authenticated;
create function t.uid(e text) returns uuid language sql security definer as $$ select id from auth.users where email=e $$;
create function t.act(e text) returns void language sql as $$ select set_config('request.jwt.claim.sub', t.uid(e)::text, false) $$;
create function t.put(k text, v text) returns void language sql security definer as $$ insert into t.v values (k,v) on conflict (k) do update set v=excluded.v $$;
create function t.get(k text) returns uuid language sql security definer as $$ select v::uuid from t.v where t.v.k=$1 $$;
grant execute on all functions in schema t to authenticated;
create table t.out(n serial, line text);
grant all on t.out, t.out_n_seq to authenticated;
create function t.check(name text, ok boolean, detail text) returns void language sql as
 $$ insert into t.out(line) values ((case when ok then 'PASS' else 'FAIL' end) || '  ' || name || coalesce('  — ' || detail, '')) $$;
grant execute on all functions in schema t to authenticated;

-- try something as the current role; return the error text, or 'ok'
create function t.try(sql text) returns text language plpgsql as $$
begin execute sql; return 'ok'; exception when others then return sqlstate || ': ' || sqlerrm; end $$;
grant execute on function t.try(text) to authenticated;

-- ── 1. A places an order: 13.70 ─────────────────────────────────────
select t.act('a@x.com');
set role authenticated;
select t.put('orig', public.submit_tooth_order(t.uid('shop@x.com'), 5::smallint,
  '[{"tooth_number":11,"tooth_type":"frasaco","quantity":2},{"tooth_number":11,"tooth_type":"copy_a","quantity":1},{"tooth_number":46,"tooth_type":"frasaco","quantity":3}]'::jsonb)::text);
reset role;
select t.check('original order is 13.70', (select total_price from orders where id=t.get('orig')) = 13.70, (select total_price::text from orders where id=t.get('orig')));

-- ── 2. A edits it, prices unchanged: new selection 21 frasaco x2 = 5.00
select t.act('a@x.com');
set role authenticated;
select t.put('e1', public.edit_pending_order(t.get('orig'), '[{"tooth_number":21,"tooth_type":"frasaco","quantity":2}]'::jsonb, 5.00)::text);
reset role;
select t.check('the edit produced a new order at 5.00', (select total_price from orders where id=t.get('e1')) = 5.00, (select total_price::text from orders where id=t.get('e1')));
select t.check('same supplier, same week, still pending',
  (select supplier_id = t.uid('shop@x.com') and week_number = 5 and fulfillment_status::text='pending' from orders where id=t.get('e1')), null);
select t.check('old order is cancelled and points at the new one',
  (select fulfillment_status::text='cancelled' and replaced_by = t.get('e1') from orders where id=t.get('orig')), null);
select t.check('old order kept its own total and lines untouched',
  (select total_price from orders where id=t.get('orig')) = 13.70
  and (select string_agg(tooth_number||tooth_type::text||quantity||'@'||unit_price, ',' order by tooth_number, tooth_type) from order_items where order_id=t.get('orig'))
      = '11frasaco2@2.50,11copy_a1@1.20,46frasaco3@2.50',
  (select string_agg(tooth_number||' '||tooth_type::text||' x'||quantity||' @'||unit_price, ', ' order by tooth_number, tooth_type) from order_items where order_id=t.get('orig')));

-- ── 3. Hidden from both sides ────────────────────────────────────────
select t.act('a@x.com'); set role authenticated;
select t.put('a_sees', (select string_agg(total_price::text, ',') from orders));
select t.put('a_old_lines', (select count(*)::text from order_items where order_id=t.get('orig')));
reset role;
select t.check('student sees one order, the new one', (select v from t.v where k='a_sees') = '5.00', 'sees: ' || (select v from t.v where k='a_sees'));
select t.check('student cannot read the old order''s lines', (select v from t.v where k='a_old_lines') = '0', null);
select t.act('shop@x.com'); set role authenticated;
select t.put('s_sees', (select string_agg(total_price::text, ',') from orders));
reset role;
select t.check('supplier sees one order, the new one', (select v from t.v where k='s_sees') = '5.00', 'sees: ' || (select v from t.v where k='s_sees'));

-- ── 4. Supplier raises prices; A edits with the stale total ───────────
update suppliers set frasaco_price = 9.99, copy_a_price = 7.77 where id = t.uid('shop@x.com');
select t.act('a@x.com'); set role authenticated;
select t.put('stale', t.try($$select public.edit_pending_order(t.get('e1'), '[{"tooth_number":21,"tooth_type":"frasaco","quantity":2}]'::jsonb, 5.00)$$));
reset role;
select t.check('a stale total is refused, saying the new total', (select v from t.v where k='stale') like 'DT001%19.98%', (select v from t.v where k='stale'));
select t.check('and nothing changed: order still pending at 5.00, no stray order',
  (select fulfillment_status::text='pending' and total_price=5.00 and replaced_by is null from orders where id=t.get('e1'))
  and (select count(*) from orders) = 2, (select count(*)::text || ' orders in total' from orders));

-- ── 5. Same edit, having seen the new total: goes through at 19.98 ────
select t.act('a@x.com'); set role authenticated;
select t.put('e2', public.edit_pending_order(t.get('e1'), '[{"tooth_number":21,"tooth_type":"frasaco","quantity":2}]'::jsonb, 19.98)::text);
reset role;
select t.check('with the new total confirmed, the edit goes through at current prices',
  (select total_price from orders where id=t.get('e2')) = 19.98, (select total_price::text from orders where id=t.get('e2')));
select t.check('the order it replaced still says 5.00 — never repriced',
  (select total_price from orders where id=t.get('e1')) = 5.00
  and (select unit_price from order_items where order_id=t.get('e1')) = 2.50, null);

-- ── 6. Another student cannot edit it ─────────────────────────────────
select t.act('b@x.com'); set role authenticated;
select t.put('b_try', t.try($$select public.edit_pending_order(t.get('e2'), '[{"tooth_number":11,"tooth_type":"frasaco","quantity":1}]'::jsonb, null)$$));
reset role;
select t.check('student B cannot edit student A''s order',
  (select fulfillment_status::text='pending' and replaced_by is null and total_price=19.98 from orders where id=t.get('e2'))
  and (select count(*) from orders) = 3, (select v from t.v where k='b_try'));

-- ── 7. A replaced order cannot be edited again ────────────────────────
select t.act('a@x.com'); set role authenticated;
select t.put('again', t.try($$select public.edit_pending_order(t.get('orig'), '[{"tooth_number":11,"tooth_type":"frasaco","quantity":1}]'::jsonb, null)$$));
reset role;
select t.check('an already-replaced order cannot be edited again', (select count(*) from orders) = 3, (select v from t.v where k='again'));

-- ── 8. The late confirm: supplier confirms an order that was just replaced
select t.act('shop@x.com'); set role authenticated;
select t.put('late_rls', t.try($$update public.orders set fulfillment_status='confirmed' where id = t.get('orig')$$));
reset role;
select t.check('supplier cannot touch a replaced order through the API',
  (select fulfillment_status::text from orders where id=t.get('orig')) = 'cancelled', 'still ' || (select fulfillment_status::text from orders where id=t.get('orig')));
select t.put('late_su', t.try($$update public.orders set fulfillment_status='confirmed' where id = t.get('orig')$$));
select t.check('not even the superuser can revive a replaced order',
  (select fulfillment_status::text from orders where id=t.get('orig')) = 'cancelled', (select v from t.v where k='late_su'));

-- ── 9. Once confirmed, the edit is refused ────────────────────────────
update orders set fulfillment_status = 'confirmed' where id = t.get('e2');
select t.act('a@x.com'); set role authenticated;
select t.put('conf', t.try($$select public.edit_pending_order(t.get('e2'), '[{"tooth_number":11,"tooth_type":"frasaco","quantity":1}]'::jsonb, null)$$));
reset role;
select t.check('a confirmed order cannot be edited',
  (select fulfillment_status::text='confirmed' and replaced_by is null and total_price=19.98 from orders where id=t.get('e2'))
  and (select count(*) from orders) = 3, (select v from t.v where k='conf'));

-- ── 10. Nobody can set replaced_by by hand ────────────────────────────
select t.act('shop@x.com'); set role authenticated;
select t.put('hand', t.try($$update public.orders set replaced_by = t.get('orig') where id = t.get('e2')$$));
reset role;
select t.check('replaced_by cannot be written through the API',
  (select replaced_by is null from orders where id=t.get('e2')), (select v from t.v where k='hand'));

select line from t.out order by n;
select (select count(*) from t.out where line like 'PASS%') || '/' || (select count(*) from t.out) || ' passed';
