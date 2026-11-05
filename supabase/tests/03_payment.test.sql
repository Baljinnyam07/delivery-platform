-- Payment recording: one full payment, independent of delivery status.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

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

insert into public.deliveries (id, customer_name, customer_phone, address, amount_due) values
  ('dddddddd-0000-0000-0000-000000000001', 'A', '1', 'Addr 1', 50000),
  ('dddddddd-0000-0000-0000-000000000002', 'B', '2', 'Addr 2', 0),
  ('dddddddd-0000-0000-0000-000000000003', 'C', '3', 'Addr 3', 30000);

set local role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.assign_delivery('dddddddd-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222');
select public.assign_delivery('dddddddd-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222');
select public.assign_delivery('dddddddd-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222');

select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.record_payment('dddddddd-0000-0000-0000-000000000001', 'CASH', 50000) $$,
  'P0001', 'PAYMENT_NOT_ALLOWED', 'courier cannot record payment before starting delivery');

select public.start_delivery('dddddddd-0000-0000-0000-000000000001');
select public.start_delivery('dddddddd-0000-0000-0000-000000000002');
select public.start_delivery('dddddddd-0000-0000-0000-000000000003');

select throws_ok($$ select public.record_payment('dddddddd-0000-0000-0000-000000000001', 'CASH', 20000) $$,
  'P0001', 'AMOUNT_MISMATCH', 'partial payment is rejected');
select throws_ok($$ select public.record_payment('dddddddd-0000-0000-0000-000000000001', 'CASH', 50000, 'other/receipt.jpg') $$,
  'P0001', 'INVALID_RECEIPT_PATH', 'receipt must be stored under the delivery folder');
select throws_ok($$ select public.record_payment('dddddddd-0000-0000-0000-000000000002', 'CASH', 1) $$,
  'P0001', 'PAYMENT_NOT_REQUIRED', 'zero-amount delivery needs no payment');
select lives_ok($$ select public.record_payment('dddddddd-0000-0000-0000-000000000001', 'CASH', 50000) $$,
  'courier records full cash payment');
select results_eq(
  $$ select status::text, payment_status::text, payment_method::text from public.deliveries
     where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  $$ values ('IN_PROGRESS', 'PAID', 'CASH') $$,
  'payment status changes, delivery status does not');
select throws_ok($$ select public.record_payment('dddddddd-0000-0000-0000-000000000001', 'CASH', 50000) $$,
  'P0001', 'PAYMENT_ALREADY_RECORDED', 'duplicate payment is rejected');
select throws_ok($$ select public.void_payment((select id from public.payment_records where delivery_id = 'dddddddd-0000-0000-0000-000000000001'), 'mistake') $$,
  'P0001', 'NOT_AUTHORIZED', 'courier cannot void payments');

select lives_ok($$ select public.complete_delivery('dddddddd-0000-0000-0000-000000000003') $$,
  'courier completes d3 without payment');
select is((select payment_status::text from public.deliveries where id = 'dddddddd-0000-0000-0000-000000000003'), 'UNPAID',
  'delivered delivery can remain UNPAID');

select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.record_payment('dddddddd-0000-0000-0000-000000000003', 'CASH', 30000) $$,
  'P0001', 'NOT_AUTHORIZED', 'other courier cannot record payment');

-- admin
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select throws_ok($$ update public.deliveries set amount_due = 1 where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  'P0001', 'AMOUNT_LOCKED', 'amount cannot change after payment');
select throws_ok($$ select public.void_payment((select id from public.payment_records where delivery_id = 'dddddddd-0000-0000-0000-000000000001'), ' ') $$,
  'P0001', 'REASON_REQUIRED', 'void requires reason');
select lives_ok($$ select public.void_payment((select id from public.payment_records where delivery_id = 'dddddddd-0000-0000-0000-000000000001'), 'Wrong method') $$,
  'admin voids payment');
select lives_ok($$ select public.record_payment('dddddddd-0000-0000-0000-000000000001', 'BANK_TRANSFER', 50000) $$,
  'admin records corrected payment');
select results_eq(
  $$ select count(*)::int, count(*) filter (where voided_at is null)::int from public.payment_records
     where delivery_id = 'dddddddd-0000-0000-0000-000000000001' $$,
  $$ values (2, 1) $$,
  'voided payment is kept; exactly one active payment');

select * from finish();
rollback;
