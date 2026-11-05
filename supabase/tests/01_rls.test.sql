-- RLS and column privileges.
-- Run: pnpm supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- ---------- fixtures ----------
create function pg_temp.mk(p_id uuid, p_role text) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
          p_id::text || '@test.local', jsonb_build_object('role', p_role),
          jsonb_build_object('full_name', p_role || ' test'));
$$;
create function pg_temp.as_user(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;

select pg_temp.mk('11111111-1111-1111-1111-111111111111', 'ADMIN');
select pg_temp.mk('22222222-2222-2222-2222-222222222222', 'COURIER');
select pg_temp.mk('33333333-3333-3333-3333-333333333333', 'COURIER');
select pg_temp.mk('99999999-9999-9999-9999-999999999999', 'NONE'); -- no role → no profile

insert into public.deliveries (id, customer_name, customer_phone, address, amount_due) values
  ('dddddddd-0000-0000-0000-000000000001', 'A', '1', 'Addr 1', 1000),
  ('dddddddd-0000-0000-0000-000000000002', 'B', '2', 'Addr 2', 2000);

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.assign_delivery('dddddddd-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222');

-- ---------- profiles ----------
select is((select count(*)::int from public.profiles where id = '99999999-9999-9999-9999-999999999999'), 0,
  'auth user without app_metadata role gets no profile');

-- ---------- courier 1 ----------
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
set local role authenticated;

select is((select count(*)::int from public.deliveries), 1,
  'courier sees only own deliveries (not unassigned ones)');
select is((select count(*)::int from public.list_available_deliveries() where id::text like 'dddddddd-%'), 1,
  'courier sees unassigned deliveries through list_available_deliveries()');
select is((select count(*)::int from public.delivery_status_history), 2,
  'courier sees status history of own delivery');

select throws_ok(
  $$ update public.deliveries set status = 'DELIVERED' where id = 'dddddddd-0000-0000-0000-000000000002' $$,
  '42501', null, 'courier cannot update status directly');
select throws_ok(
  $$ update public.deliveries set courier_id = '33333333-3333-3333-3333-333333333333' where id = 'dddddddd-0000-0000-0000-000000000002' $$,
  '42501', null, 'courier cannot change courier_id directly');
select throws_ok(
  $$ update public.profiles set role = 'ADMIN' where id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'courier cannot change own role');
select throws_ok(
  $$ insert into public.deliveries (customer_name, customer_phone, address) values ('x', 'x', 'x') $$,
  '42501', null, 'courier cannot create deliveries');
select throws_ok(
  $$ delete from public.deliveries $$,
  '42501', null, 'nobody can delete deliveries');
select throws_ok(
  $$ insert into public.delivery_status_history (delivery_id, to_status) values ('dddddddd-0000-0000-0000-000000000002', 'DELIVERED') $$,
  '42501', null, 'status history cannot be written by clients');
select lives_ok(
  $$ update public.deliveries set notes = 'hacked' where id = 'dddddddd-0000-0000-0000-000000000002' $$,
  'courier update of descriptive column runs...');
select lives_ok(
  $$ update public.profiles set full_name = 'Courier One' where id = '22222222-2222-2222-2222-222222222222' $$,
  'courier can update own name');

-- ---------- courier 2 ----------
reset role;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
set local role authenticated;
select is((select count(*)::int from public.deliveries), 0,
  'other courier cannot see delivery assigned to courier 1');

-- ---------- anon ----------
reset role;
set local role anon;
select throws_ok($$ select * from public.deliveries $$, '42501', null, 'anon has no access');
select throws_ok($$ select public.list_available_deliveries() $$, '42501', null, 'anon cannot call RPCs');

-- ---------- admin ----------
reset role;
select is((select notes from public.deliveries where id = 'dddddddd-0000-0000-0000-000000000002'), null,
  '...but RLS blocks it: notes unchanged');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
set local role authenticated;
select throws_ok(
  $$ update public.deliveries set status = 'CANCELLED' where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  '42501', null, 'even admin cannot bypass RPCs to change status');

select * from finish();
rollback;
