-- Assignment, return, reassignment and status transitions.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

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

-- admin = 1111…, courier A = 2222…, courier B = 3333…
select pg_temp.mk('11111111-1111-1111-1111-111111111111', 'ADMIN');
select pg_temp.mk('22222222-2222-2222-2222-222222222222', 'COURIER');
select pg_temp.mk('33333333-3333-3333-3333-333333333333', 'COURIER');

insert into public.deliveries (id, customer_name, customer_phone, address, amount_due) values
  ('dddddddd-0000-0000-0000-000000000001', 'A', '1', 'Addr 1', 1000),
  ('dddddddd-0000-0000-0000-000000000002', 'B', '2', 'Addr 2', 2000),
  ('dddddddd-0000-0000-0000-000000000003', 'C', '3', 'Addr 3', 3000),
  ('dddddddd-0000-0000-0000-000000000004', 'D', '4', 'Addr 4', 4000),
  ('dddddddd-0000-0000-0000-000000000005', 'E', '5', 'Addr 5', 5000);

set local role authenticated;

-- ================= claim =================
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select lives_ok($$ select public.claim_delivery('dddddddd-0000-0000-0000-000000000001') $$,
  'courier A claims d1');

select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.claim_delivery('dddddddd-0000-0000-0000-000000000001') $$,
  'P0001', 'DELIVERY_NOT_AVAILABLE', 'courier B cannot claim an already claimed delivery');
select throws_ok($$ select public.claim_delivery('dddddddd-0000-0000-0000-0000000000ff') $$,
  'P0001', 'DELIVERY_NOT_FOUND', 'claiming a missing delivery reports DELIVERY_NOT_FOUND');
select throws_ok($$ select public.assign_delivery('dddddddd-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333') $$,
  'P0001', 'NOT_AUTHORIZED', 'courier cannot call admin assign');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select throws_ok($$ select public.assign_delivery('dddddddd-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333') $$,
  'P0001', 'DELIVERY_NOT_AVAILABLE', 'admin cannot assign an already claimed delivery');
select throws_ok($$ select public.claim_delivery('dddddddd-0000-0000-0000-000000000002') $$,
  'P0001', 'NOT_AUTHORIZED', 'admin cannot claim (courier-only)');

select results_eq(
  $$ select status::text, courier_id from public.deliveries where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  $$ values ('ASSIGNED', '22222222-2222-2222-2222-222222222222'::uuid) $$,
  'd1 is ASSIGNED to courier A');
select is((select count(*)::int from public.delivery_assignments
           where delivery_id = 'dddddddd-0000-0000-0000-000000000001' and ended_at is null), 1,
  'd1 has exactly one active assignment');

-- ================= return (D1) =================
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.return_delivery('dddddddd-0000-0000-0000-000000000001', 'not mine') $$,
  'P0001', 'NOT_AUTHORIZED', 'courier B cannot return courier A''s delivery');

select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.return_delivery('dddddddd-0000-0000-0000-000000000001', '   ') $$,
  'P0001', 'REASON_REQUIRED', 'return requires a reason');
select lives_ok($$ select public.return_delivery('dddddddd-0000-0000-0000-000000000001', 'Car broke down') $$,
  'courier A returns d1 with reason');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select results_eq(
  $$ select status::text, courier_id from public.deliveries where id = 'dddddddd-0000-0000-0000-000000000001' $$,
  $$ values ('UNASSIGNED', null::uuid) $$,
  'returned delivery is UNASSIGNED with no courier');
select results_eq(
  $$ select end_reason::text, end_note from public.delivery_assignments
     where delivery_id = 'dddddddd-0000-0000-0000-000000000001' $$,
  $$ values ('RETURNED', 'Car broke down') $$,
  'return is kept in assignment history with reason');
select is((select note from public.delivery_status_history
           where delivery_id = 'dddddddd-0000-0000-0000-000000000001' and to_status = 'UNASSIGNED' and from_status = 'ASSIGNED'),
  'Returned by courier: Car broke down',
  'return reason is recorded in status history');

-- ================= reassign =================
select lives_ok($$ select public.assign_delivery('dddddddd-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222') $$,
  'admin assigns d2 to courier A');
select throws_ok($$ select public.reassign_delivery('dddddddd-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', '') $$,
  'P0001', 'REASON_REQUIRED', 'reassign requires a reason');
select throws_ok($$ select public.reassign_delivery('dddddddd-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'same') $$,
  'P0001', 'SAME_COURIER', 'cannot reassign to the same courier');
select lives_ok($$ select public.reassign_delivery('dddddddd-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Closer to customer') $$,
  'admin reassigns d2 to courier B');
select results_eq(
  $$ select courier_id, start_action::text, previous_courier_id, start_note from public.delivery_assignments
     where delivery_id = 'dddddddd-0000-0000-0000-000000000002' and ended_at is null $$,
  $$ values ('33333333-3333-3333-3333-333333333333'::uuid, 'REASSIGNED', '22222222-2222-2222-2222-222222222222'::uuid, 'Closer to customer') $$,
  'reassignment is audited with previous courier and reason');
select is((select count(*)::int from public.delivery_assignments where delivery_id = 'dddddddd-0000-0000-0000-000000000002'), 2,
  'both assignments of d2 are preserved');

-- ================= IN_PROGRESS is locked =================
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.start_delivery('dddddddd-0000-0000-0000-000000000002') $$,
  'P0001', 'INVALID_TRANSITION', 'former courier cannot start a reassigned delivery');

select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select lives_ok($$ select public.start_delivery('dddddddd-0000-0000-0000-000000000002') $$,
  'courier B starts d2');
select throws_ok($$ select public.return_delivery('dddddddd-0000-0000-0000-000000000002', 'too far') $$,
  'P0001', 'INVALID_TRANSITION', 'courier cannot return an IN_PROGRESS delivery');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select throws_ok($$ select public.reassign_delivery('dddddddd-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'try') $$,
  'P0001', 'INVALID_TRANSITION', 'IN_PROGRESS delivery cannot be reassigned');
select throws_ok($$ select public.unassign_delivery('dddddddd-0000-0000-0000-000000000002', 'try') $$,
  'P0001', 'INVALID_TRANSITION', 'IN_PROGRESS delivery cannot be unassigned');

-- ================= complete / cancel =================
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select lives_ok($$ select public.complete_delivery('dddddddd-0000-0000-0000-000000000002') $$,
  'courier B completes d2');
select is((select count(*)::int from public.delivery_assignments
           where delivery_id = 'dddddddd-0000-0000-0000-000000000002' and ended_at is null), 0,
  'completed delivery has no active assignment');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select throws_ok($$ select public.cancel_delivery('dddddddd-0000-0000-0000-000000000002', 'late') $$,
  'P0001', 'INVALID_TRANSITION', 'delivered delivery cannot be cancelled');
select results_eq(
  $$ select from_status::text, to_status::text from public.delivery_status_history
     where delivery_id = 'dddddddd-0000-0000-0000-000000000002' order by id $$,
  $$ values (null, 'UNASSIGNED'), ('UNASSIGNED', 'ASSIGNED'), ('ASSIGNED', 'IN_PROGRESS'), ('IN_PROGRESS', 'DELIVERED') $$,
  'every status change of d2 is in history, in order');

select lives_ok($$ select public.assign_delivery('dddddddd-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222') $$,
  'admin assigns d3 to courier A');
select lives_ok($$ select public.cancel_delivery('dddddddd-0000-0000-0000-000000000003', 'Customer cancelled') $$,
  'admin cancels assigned d3');
select results_eq(
  $$ select end_reason::text, end_note from public.delivery_assignments
     where delivery_id = 'dddddddd-0000-0000-0000-000000000003' $$,
  $$ values ('CANCELLED', 'Customer cancelled') $$,
  'cancellation closes the assignment with reason');

-- ================= courier activation =================
select lives_ok($$ select public.assign_delivery('dddddddd-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222') $$,
  'admin assigns d4 to courier A');
select throws_ok($$ select public.set_courier_active('22222222-2222-2222-2222-222222222222', false) $$,
  'P0001', 'HAS_ACTIVE_DELIVERIES', 'courier with active deliveries cannot be deactivated');

select * from finish();
rollback;
