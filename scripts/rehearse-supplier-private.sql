-- Rehearsal for 20260121000000_supplier_contact_private.sql, on a scratch
-- database seeded with sellers, students and orders.
\pset tuples_only on
\pset format unaligned
create temp table out(n serial, line text);
grant all on out, out_n_seq to anon, authenticated;
create function pg_temp.check(name text, ok boolean, detail text) returns void language sql as
 $$ insert into out(line) values ((case when coalesce(ok,false) then 'PASS' else 'FAIL' end) || '  ' || name || coalesce('  — ' || detail, '')) $$;
create function pg_temp.try(q text) returns text language plpgsql as $$
declare r text; begin execute q into r; return coalesce(r, 'null'); exception when others then return sqlstate || ': ' || sqlerrm; end $$;

set role anon;
select pg_temp.check('anon cannot read a seller''s phone', pg_temp.try('select contact_phone from public.suppliers limit 1') like '42501%', pg_temp.try('select contact_phone from public.suppliers limit 1'));
select pg_temp.check('anon cannot read Whish numbers or commission', pg_temp.try('select whish_number from public.suppliers limit 1') like '42501%' and pg_temp.try('select commission_rate::text from public.suppliers limit 1') like '42501%', null);
select pg_temp.check('anon still sees the market through the view', pg_temp.try('select count(*)::text from public.supplier_directory') = '2', pg_temp.try('select count(*)::text from public.supplier_directory'));
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000a001',false);
set role authenticated;
select pg_temp.check('a student cannot read a seller''s phone', pg_temp.try('select contact_phone from public.suppliers limit 1') like '42501%', null);
select pg_temp.check('a student still sees seller names on their orders', pg_temp.try($q$select string_agg(distinct s.display_name, ',' order by s.display_name) from public.orders o join public.suppliers s on s.id = o.supplier_id$q$) = 'Maria Christa,Mohamad Majzoub', null);
select pg_temp.check('a student still sees products on the market', pg_temp.try('select count(*)::text from public.products') = '2', pg_temp.try('select count(*)::text from public.products'));
select pg_temp.check('a student can still place an order', pg_temp.try($q$select public.submit_tooth_order('00000000-0000-0000-0000-00000000a002', 1::smallint, '[{"tooth_number":12,"tooth_type":"frasaco","quantity":1}]'::jsonb, 2.50)::text$q$) ~ '^[0-9a-f-]{36}$', null);
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000a002',false);
set role authenticated;
select pg_temp.check('a seller reads their own week and prices', pg_temp.try('select current_week || '' '' || frasaco_price from public.suppliers where id = auth.uid()') = '5 2.50', pg_temp.try('select current_week || '' '' || frasaco_price from public.suppliers where id = auth.uid()'));
select pg_temp.check('a seller can still change prices', pg_temp.try($q$with u as (update public.suppliers set frasaco_price = 2.75 where id = auth.uid() returning frasaco_price) select frasaco_price::text from u$q$) = '2.75', null);
select pg_temp.check('a seller can still set the week', pg_temp.try($q$with u as (update public.suppliers set current_week = 6, week_set_at = now() where id = auth.uid() returning current_week) select current_week::text from u$q$) = '6', null);
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000a005',false);
set role authenticated;
select pg_temp.check('the admin overview still reads every seller', pg_temp.try('select count(*)::text from public.suppliers') = '2', null);
reset role;

select pg_temp.check('the view no longer runs with its creator''s rights',
  (select 'security_invoker=true' = any (reloptions) from pg_class where oid = 'public.supplier_directory'::regclass), null);

select line from out order by n;
select (select count(*) from out where line like 'PASS%') || '/' || (select count(*) from out) || ' passed';
