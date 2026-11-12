-- Notifications: personal events and the "delivery available" broadcast (one per delivery).
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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
create function pg_temp.n(p_recipient uuid, p_type text) returns int language sql as $$
  select count(*)::int from public.notifications where recipient_id = p_recipient and type = p_type;
$$;

-- Isolate from seed data.
delete from public.notifications;

select pg_temp.mk('11111111-1111-1111-1111-111111111111', 'ADMIN');
select pg_temp.mk('22222222-2222-2222-2222-222222222222', 'COURIER');
select pg_temp.mk('33333333-3333-3333-3333-333333333333', 'COURIER');
select pg_temp.mk('44444444-4444-4444-4444-444444444444', 'COURIER');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.set_courier_active('44444444-4444-4444-4444-444444444444', false);

-- Admin creates a delivery through the client path (RLS + column grants).
set local role authenticated;
select lives_ok($$ insert into public.deliveries (id, customer_name, customer_phone, address, amount_due)
                   values ('dddddddd-0000-0000-0000-000000000001', 'A', '1', 'Addr 1', 1000) $$,
  'admin creates a delivery');
reset role;

select is(pg_temp.n('22222222-2222-2222-2222-222222222222', 'DELIVERY_AVAILABLE'), 1, 'active courier A notified');
select is(pg_temp.n('33333333-3333-3333-3333-333333333333', 'DELIVERY_AVAILABLE'), 1, 'active courier B notified');
select is(pg_temp.n('44444444-4444-4444-4444-444444444444', 'DELIVERY_AVAILABLE'), 0, 'inactive courier not notified');

set local role authenticated;
insert into public.deliveries (id, customer_name, customer_phone, address)
values ('dddddddd-0000-0000-0000-000000000002', 'B', '2', 'Addr 2');
reset role;
select is((select count(*)::int from public.notifications where type = 'DELIVERY_AVAILABLE'
           and recipient_id in ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')), 4,
  'every new delivery notifies every active courier (no throttle)');
select is((select title from public.notifications n join public.deliveries d on d.id = 'dddddddd-0000-0000-0000-000000000002'
           where n.recipient_id = '22222222-2222-2222-2222-222222222222' and n.title like '%' || d.code),
  'Шинэ хүргэлт: ' || (select code from public.deliveries where id = 'dddddddd-0000-0000-0000-000000000002'),
  'the alert names the delivery');

set local role authenticated;
select public.assign_delivery('dddddddd-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222');
reset role;
select is(pg_temp.n('22222222-2222-2222-2222-222222222222', 'DELIVERY_ASSIGNED'), 1, 'assigned courier is notified');

select throws_ok($$ select public.assign_delivery('dddddddd-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444') $$,
  'P0001', 'COURIER_INACTIVE', 'cannot assign to inactive courier');

-- Courier sees only own notifications and can only mark them read.
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
set local role authenticated;
select is((select count(*)::int from public.notifications), 2, 'courier B sees only own notifications');
select lives_ok($$ update public.notifications set read_at = now() $$, 'courier can mark own notifications read');
select throws_ok($$ update public.notifications set title = 'x' $$, '42501', null, 'courier cannot edit notification content');
reset role;

select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
set local role authenticated;
select throws_ok($$ select public.list_available_deliveries() $$,
  'P0001', 'USER_INACTIVE', 'inactive courier is blocked from RPCs');

select * from finish();
rollback;
