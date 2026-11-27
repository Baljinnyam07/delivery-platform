-- Couriers create their own orders (0020).
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

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
set local role authenticated;

-- Admin: catalogue
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.factories (id, name) values ('ffffffff-0000-0000-0000-0000000000c1', 'Courier test brand');
insert into public.products (id, factory_id, name, unit_price) values
  ('eeeeeeee-0000-0000-0000-0000000000c1', 'ffffffff-0000-0000-0000-0000000000c1', 'Courier product', 5000);
select public.adjust_stock('eeeeeeee-0000-0000-0000-0000000000c1', 10);

-- Courier 2 creates an order
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
delete from public.notifications;

select ok(exists (select 1 from public.list_order_products() where id = 'eeeeeeee-0000-0000-0000-0000000000c1'),
  'courier sees active products for the order form');

select lives_ok($$ select public.create_courier_order(
    '{"id":"dddddddd-0000-0000-0000-0000000000c1","customer_name":"C","customer_phone":"99001122","address":"Addr","delivery_fee":2000}',
    '[{"product_id":"eeeeeeee-0000-0000-0000-0000000000c1","quantity":2}]') $$,
  'courier creates an order with products');

select is((select status::text from public.deliveries where id = 'dddddddd-0000-0000-0000-0000000000c1'),
  'ASSIGNED', 'the order is assigned at once');
select is((select courier_id from public.deliveries where id = 'dddddddd-0000-0000-0000-0000000000c1'),
  '22222222-2222-2222-2222-222222222222'::uuid, '… to the courier who created it');
select is((select created_by from public.deliveries where id = 'dddddddd-0000-0000-0000-0000000000c1'),
  '22222222-2222-2222-2222-222222222222'::uuid, 'created_by records the courier');
select is((select amount_due from public.deliveries where id = 'dddddddd-0000-0000-0000-0000000000c1'),
  12000.00, 'amount = 2 x 5000 + 2000 fee');
select is((select start_action::text from public.delivery_assignments where delivery_id = 'dddddddd-0000-0000-0000-0000000000c1'),
  'CLAIMED', 'assignment audit row exists');
select is((select count(*)::int from public.notifications where type = 'DELIVERY_AVAILABLE'),
  0, 'no "available" push for a courier''s own order');

select is(public.create_courier_order(
    '{"id":"dddddddd-0000-0000-0000-0000000000c1","customer_name":"C","customer_phone":"99001122","address":"Addr"}',
    '[{"product_id":"eeeeeeee-0000-0000-0000-0000000000c1","quantity":2}]'),
  'dddddddd-0000-0000-0000-0000000000c1'::uuid, 'replayed submit returns the same order');
select is((select stock from public.products where id = 'eeeeeeee-0000-0000-0000-0000000000c1'),
  8, '… and stock is taken only once');

select is((select amount_due from public.deliveries where id = public.create_courier_order(
    '{"customer_name":"C","customer_phone":"99001122","address":"Addr","package_description":"Box"}', '[]', 15000)),
  15000.00, 'order without products uses the given amount');

-- Another courier cannot hijack the id
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.create_courier_order(
    '{"id":"dddddddd-0000-0000-0000-0000000000c1","customer_name":"C","customer_phone":"99001122","address":"Addr"}') $$,
  'P0001', 'NOT_AUTHORIZED', 'another courier cannot reuse an existing id');

-- Admins use create_delivery, not this
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select throws_ok($$ select public.create_courier_order(
    '{"customer_name":"C","customer_phone":"99001122","address":"Addr"}') $$,
  'P0001', 'NOT_AUTHORIZED', 'admins cannot call the courier entry point');

select * from finish();
rollback;
