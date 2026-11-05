-- Admin statistics RPCs. Fixtures are moved to 2030-01-01 (UB time) so the
-- seed data never falls inside the tested period.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

create function pg_temp.mk(p_id uuid, p_role text) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
          p_id::text || '@test.local', jsonb_build_object('role', p_role),
          jsonb_build_object('full_name', p_role || ' ' || left(p_id::text, 4)));
$$;
create function pg_temp.as_user(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;

select pg_temp.mk('11111111-1111-1111-1111-111111111111', 'ADMIN');
select pg_temp.mk('22222222-2222-2222-2222-222222222222', 'COURIER');
select pg_temp.mk('33333333-3333-3333-3333-333333333333', 'COURIER');

insert into public.deliveries (id, customer_name, customer_phone, address, amount_due) values
  ('dddddddd-0000-0000-0000-000000000001', 'A', '1', 'Addr 1', 10000),
  ('dddddddd-0000-0000-0000-000000000002', 'B', '2', 'Addr 2', 5000),
  ('dddddddd-0000-0000-0000-000000000003', 'C', '3', 'Addr 3', 7000),
  ('dddddddd-0000-0000-0000-000000000004', 'D', '4', 'Addr 4', 1000);

-- admin assigns
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.assign_delivery('dddddddd-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222');
select public.assign_delivery('dddddddd-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222');
select public.assign_delivery('dddddddd-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333');
select public.cancel_delivery('dddddddd-0000-0000-0000-000000000004', 'test');

-- courier 1: two delivered, cash + transfer
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select public.start_delivery('dddddddd-0000-0000-0000-000000000001');
select public.record_payment('dddddddd-0000-0000-0000-000000000001', 'CASH', 10000);
select public.complete_delivery('dddddddd-0000-0000-0000-000000000001');
select public.start_delivery('dddddddd-0000-0000-0000-000000000002');
select public.record_payment('dddddddd-0000-0000-0000-000000000002', 'BANK_TRANSFER', 5000);
select public.complete_delivery('dddddddd-0000-0000-0000-000000000002');

-- courier 2: in progress, cash recorded then voided by admin
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select public.start_delivery('dddddddd-0000-0000-0000-000000000003');
select public.record_payment('dddddddd-0000-0000-0000-000000000003', 'CASH', 7000);
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.void_payment(
  (select id from public.payment_records where delivery_id = 'dddddddd-0000-0000-0000-000000000003'), 'wrong');

-- Move fixtures into 2030-01-01 (Asia/Ulaanbaatar). d4 is created at 23:30 local
-- (15:30 UTC) and must still count for 2030-01-01.
update public.deliveries
   set created_at = '2030-01-01 09:00+08', started_at = '2030-01-01 10:00+08', delivered_at = '2030-01-01 10:30+08'
 where id in ('dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002');
update public.deliveries
   set created_at = '2030-01-01 09:00+08', started_at = '2030-01-01 11:00+08'
 where id = 'dddddddd-0000-0000-0000-000000000003';
update public.deliveries
   set created_at = '2030-01-01 23:30+08', cancelled_at = '2030-01-01 23:45+08'
 where id = 'dddddddd-0000-0000-0000-000000000004';
update public.payment_records set recorded_at = '2030-01-01 10:20+08'
 where delivery_id::text like 'dddddddd-%';

set local role authenticated;

-- ---------- dashboard ----------
select results_eq(
  $$ select (s->>'created')::int, (s->>'delivered')::int, (s->>'cancelled')::int,
            (s->>'collected_cash')::numeric, (s->>'collected_transfer')::numeric
     from public.get_dashboard_stats('2030-01-01 00:00+08', '2030-01-02 00:00+08') s $$,
  $$ values (4, 2, 1, 10000::numeric, 5000::numeric) $$,
  'dashboard period counts and collections (voided cash excluded)');

select is(
  (select (s->>'created')::int from public.get_dashboard_stats('2030-01-02 00:00+08', '2030-01-03 00:00+08') s),
  0, 'next UB day is empty (23:30 local stays on its own day)');

select throws_ok($$ select public.get_dashboard_stats('2030-01-02', '2030-01-01') $$,
  'P0001', 'INVALID_RANGE', 'reversed range is rejected');

-- ---------- couriers ----------
select results_eq(
  $$ select delivered_count, avg_delivery_minutes, cash_collected, transfer_collected, in_progress_now
     from public.get_courier_stats('2030-01-01 00:00+08', '2030-01-02 00:00+08')
     where courier_id = '22222222-2222-2222-2222-222222222222' $$,
  $$ values (2, 30, 10000::numeric, 5000::numeric, 0) $$,
  'courier 1: delivered, average time, cash and transfer');

select results_eq(
  $$ select delivered_count, cash_collected, in_progress_now
     from public.get_courier_stats('2030-01-01 00:00+08', '2030-01-02 00:00+08')
     where courier_id = '33333333-3333-3333-3333-333333333333' $$,
  $$ values (0, 0::numeric, 1) $$,
  'courier 2: voided cash is not counted as held');

select is(
  (select count(*)::int from public.get_courier_stats('2030-01-01 00:00+08', '2030-01-02 00:00+08')
    where courier_id in ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')),
  2, 'every courier is listed');

-- ---------- daily report ----------
select results_eq(
  $$ select created, delivered, cancelled, cash, transfer from public.get_daily_report('2030-01-01', '2030-01-01') $$,
  $$ values (4, 2, 1, 10000::numeric, 5000::numeric) $$,
  'daily report groups by Ulaanbaatar calendar day');

select is((select count(*)::int from public.get_daily_report('2030-01-01', '2030-01-07')), 7,
  'one row per day, including empty days');

select throws_ok($$ select public.get_daily_report('2030-01-01', '2032-01-01') $$,
  'P0001', 'INVALID_RANGE', 'range longer than a year is rejected');

-- ---------- authorization ----------
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.get_dashboard_stats('2030-01-01', '2030-01-02') $$,
  'P0001', 'NOT_AUTHORIZED', 'courier cannot read dashboard stats');
select throws_ok($$ select public.get_courier_stats('2030-01-01', '2030-01-02') $$,
  'P0001', 'NOT_AUTHORIZED', 'courier cannot read courier stats');
select throws_ok($$ select public.get_daily_report('2030-01-01', '2030-01-02') $$,
  'P0001', 'NOT_AUTHORIZED', 'courier cannot read reports');

select * from finish();
rollback;
