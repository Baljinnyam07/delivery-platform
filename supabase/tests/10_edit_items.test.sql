-- Editing the products of an existing delivery keeps stock exact.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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
create function pg_temp.stock(p_id uuid) returns integer language sql as $$
  select stock from public.products where id = p_id;
$$;
create function pg_temp.d() returns public.deliveries language sql as $$
  select * from public.deliveries where id = 'dddddddd-0000-0000-0000-0000000000e1';
$$;

select pg_temp.mk('11111111-1111-1111-1111-111111111111', 'ADMIN');
select pg_temp.mk('22222222-2222-2222-2222-222222222222', 'COURIER');
set local role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');

insert into public.factories (id, name) values ('ffffffff-0000-0000-0000-0000000000e1', 'Edit factory');
insert into public.products (id, factory_id, name, unit_price) values
  ('eeeeeeee-0000-0000-0000-0000000000e1', 'ffffffff-0000-0000-0000-0000000000e1', 'Alpha', 1000),
  ('eeeeeeee-0000-0000-0000-0000000000e2', 'ffffffff-0000-0000-0000-0000000000e1', 'Beta', 3000);
select public.adjust_stock(id, 10) from public.products where factory_id = 'ffffffff-0000-0000-0000-0000000000e1';

-- Start: 2 × Alpha, fee 500 → amount 2,500; Alpha stock 8.
select public.create_delivery(
  '{"id":"dddddddd-0000-0000-0000-0000000000e1","customer_name":"E","customer_phone":"99001122","address":"Addr","delivery_fee":500}',
  '[{"product_id":"eeeeeeee-0000-0000-0000-0000000000e1","quantity":2}]');

-- Edit: Alpha 2 → 5, add 1 × Beta.
select lives_ok($$ select public.update_delivery_items('dddddddd-0000-0000-0000-0000000000e1',
  '[{"product_id":"eeeeeeee-0000-0000-0000-0000000000e1","quantity":5},
    {"product_id":"eeeeeeee-0000-0000-0000-0000000000e2","quantity":1}]') $$, 'admin edits items');
select is(pg_temp.stock('eeeeeeee-0000-0000-0000-0000000000e1'), 5, 'increase reserves only the difference (10-5)');
select is(pg_temp.stock('eeeeeeee-0000-0000-0000-0000000000e2'), 9, 'added product is reserved');
select is((pg_temp.d()).amount_due, 8500.00::numeric, 'amount = 5x1000 + 1x3000 + fee 500');
select is((pg_temp.d()).package_description, 'Alpha ×5, Beta ×1', 'summary follows the items');

-- Edit: remove Alpha, Beta 1 → 2, fee 0.
select public.update_delivery_items('dddddddd-0000-0000-0000-0000000000e1',
  '[{"product_id":"eeeeeeee-0000-0000-0000-0000000000e2","quantity":2}]', null, 0);
select is(pg_temp.stock('eeeeeeee-0000-0000-0000-0000000000e1'), 10, 'removed product goes back to stock');
select is(pg_temp.stock('eeeeeeee-0000-0000-0000-0000000000e2'), 8, 'second increase reserved');
select is((pg_temp.d()).amount_due, 6000.00::numeric, 'fee can be changed');
select is((select count(*)::int from public.stock_movements
           where delivery_id = 'dddddddd-0000-0000-0000-0000000000e1' and note is not null), 4,
  'every edit is logged in stock history');

-- Manual goods amount still works.
select public.update_delivery_items('dddddddd-0000-0000-0000-0000000000e1',
  '[{"product_id":"eeeeeeee-0000-0000-0000-0000000000e2","quantity":2}]', 5000, 1000);
select is((pg_temp.d()).amount_due, 6000.00::numeric, 'manual goods amount + fee');

-- Errors leave everything unchanged.
select throws_ok($$ select public.update_delivery_items('dddddddd-0000-0000-0000-0000000000e1',
  '[{"product_id":"eeeeeeee-0000-0000-0000-0000000000e2","quantity":50}]') $$,
  'P0001', 'NOT_ENOUGH_STOCK', 'cannot reserve more than stock');
select is(pg_temp.stock('eeeeeeee-0000-0000-0000-0000000000e2'), 8, 'failed edit changes no stock');
select throws_ok($$ select public.update_delivery_items('dddddddd-0000-0000-0000-0000000000e1',
  '[{"product_id":"eeeeeeee-0000-0000-0000-0000000000e2","quantity":1},
    {"product_id":"eeeeeeee-0000-0000-0000-0000000000e2","quantity":1}]') $$,
  'P0001', 'ITEMS_INVALID', 'duplicate products rejected');

-- Removing every item clears the summary.
select public.update_delivery_items('dddddddd-0000-0000-0000-0000000000e1', '[]', 0);
select is((pg_temp.d()).package_description, null, 'summary cleared when no items remain');

-- Paid / finished deliveries are locked; couriers cannot edit.
select public.update_delivery_items('dddddddd-0000-0000-0000-0000000000e1',
  '[{"product_id":"eeeeeeee-0000-0000-0000-0000000000e1","quantity":1}]');
select public.record_payment('dddddddd-0000-0000-0000-0000000000e1', 'CASH', (pg_temp.d()).amount_due);
select throws_ok($$ select public.update_delivery_items('dddddddd-0000-0000-0000-0000000000e1', '[]') $$,
  'P0001', 'AMOUNT_LOCKED', 'paid delivery items are locked');
select public.void_payment((select id from public.payment_records where delivery_id = 'dddddddd-0000-0000-0000-0000000000e1'), 'test');
select public.cancel_delivery('dddddddd-0000-0000-0000-0000000000e1', 'test');
select throws_ok($$ select public.update_delivery_items('dddddddd-0000-0000-0000-0000000000e1', '[]') $$,
  'P0001', 'INVALID_TRANSITION', 'cancelled delivery cannot be edited');

select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.update_delivery_items('dddddddd-0000-0000-0000-0000000000e1', '[]') $$,
  'P0001', 'NOT_AUTHORIZED', 'courier cannot edit items');

select * from finish();
rollback;
