-- Products and stock: reservation on create, return on cancel, admin-only writes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

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
create function pg_temp.stock() returns integer language sql as $$
  select stock from public.products where id = 'eeeeeeee-0000-0000-0000-000000000001';
$$;

select pg_temp.mk('11111111-1111-1111-1111-111111111111', 'ADMIN');
select pg_temp.mk('22222222-2222-2222-2222-222222222222', 'COURIER');

set local role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');

insert into public.factories (id, name) values ('ffffffff-0000-0000-0000-000000000001', 'Test factory');
insert into public.products (id, factory_id, name, unit_price)
values ('eeeeeeee-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000001', 'Test product', 5000);

-- adjust_stock
select is(public.adjust_stock('eeeeeeee-0000-0000-0000-000000000001', 10, 'RESTOCK', 'initial'), 10,
  'restock adds stock');
select throws_ok($$ select public.adjust_stock('eeeeeeee-0000-0000-0000-000000000001', -1, 'RESTOCK') $$,
  'P0001', 'INVALID_STOCK_CHANGE', 'restock cannot be negative');
select throws_ok($$ select public.adjust_stock('eeeeeeee-0000-0000-0000-000000000001', -11, 'ADJUSTMENT') $$,
  'P0001', 'NOT_ENOUGH_STOCK', 'stock cannot go below zero');
select throws_ok($$ update public.products set stock = 999 where id = 'eeeeeeee-0000-0000-0000-000000000001' $$,
  '42501', null, 'stock column is not directly writable');

-- create_delivery reserves stock
select lives_ok($$ select public.create_delivery(
  '{"id":"dddddddd-0000-0000-0000-000000000001","customer_name":"P1","customer_phone":"99001122","address":"Addr 1"}',
  '[{"product_id":"eeeeeeee-0000-0000-0000-000000000001","quantity":3}]') $$,
  'delivery with items is created');
select is(pg_temp.stock(), 7, 'stock is reserved');
select is((select amount_due from public.deliveries where id = 'dddddddd-0000-0000-0000-000000000001'),
  15000.00::numeric, 'amount defaults to the sum of line totals');
select is((select package_description from public.deliveries where id = 'dddddddd-0000-0000-0000-000000000001'),
  'Test product ×3', 'package description summarises the items');
select is((select count(*)::int from public.stock_movements
           where delivery_id = 'dddddddd-0000-0000-0000-000000000001' and reason = 'DELIVERY'),
  1, 'reservation is logged');

select is(public.create_delivery(
  '{"id":"dddddddd-0000-0000-0000-000000000001","customer_name":"P1","customer_phone":"99001122","address":"Addr 1"}',
  '[{"product_id":"eeeeeeee-0000-0000-0000-000000000001","quantity":3}]'),
  'dddddddd-0000-0000-0000-000000000001'::uuid, 'double submit returns the same delivery');
select is(pg_temp.stock(), 7, 'double submit does not reserve twice');

select throws_ok($$ select public.create_delivery(
  '{"customer_name":"P-over","customer_phone":"99001122","address":"Addr"}',
  '[{"product_id":"eeeeeeee-0000-0000-0000-000000000001","quantity":8}]') $$,
  'P0001', 'NOT_ENOUGH_STOCK', 'ordering more than stock is rejected');
select is((select count(*)::int from public.deliveries where customer_name = 'P-over'), 0,
  'rejected create leaves no delivery behind');

-- prepaid
select lives_ok($$ select public.create_delivery(
  '{"id":"dddddddd-0000-0000-0000-000000000002","customer_name":"P2","customer_phone":"99001122","address":"Addr 2"}',
  '[{"product_id":"eeeeeeee-0000-0000-0000-000000000001","quantity":2}]', null, 'CASH') $$,
  'prepaid delivery is created');
select is((select payment_status::text from public.deliveries where id = 'dddddddd-0000-0000-0000-000000000002'),
  'PAID', 'prepaid delivery is paid');
select throws_ok($$ select public.create_delivery(
  '{"customer_name":"P-zero","customer_phone":"99001122","address":"Addr"}', '[]', null, 'CASH') $$,
  'P0001', 'PAYMENT_NOT_REQUIRED', 'zero-amount delivery cannot be prepaid');

-- cancel returns stock
select lives_ok($$ select public.cancel_delivery('dddddddd-0000-0000-0000-000000000001', 'test cancel') $$,
  'delivery is cancelled');
select is(pg_temp.stock(), 8, 'cancel returns reserved stock (10 - 3 - 2 + 3)');

-- courier
select public.assign_delivery('dddddddd-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.adjust_stock('eeeeeeee-0000-0000-0000-000000000001', 5) $$,
  'P0001', 'NOT_AUTHORIZED', 'courier cannot adjust stock');
select is((select count(*)::int from public.products), 0, 'courier cannot read products');
select is((select count(*)::int from public.delivery_items
           where delivery_id = 'dddddddd-0000-0000-0000-000000000002'),
  1, 'courier sees items of an assigned delivery');

select * from finish();
rollback;
