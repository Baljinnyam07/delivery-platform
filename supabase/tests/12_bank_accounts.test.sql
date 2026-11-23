-- Brand bank accounts for the courier's payment SMS.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

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
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');

insert into public.factories (id, name, bank_account) values
  ('ffffffff-0000-0000-0000-0000000000c1', 'Acc A', '1111 Хаан банк A'),
  ('ffffffff-0000-0000-0000-0000000000c2', 'Acc B', null);
insert into public.products (id, factory_id, name, unit_price) values
  ('eeeeeeee-0000-0000-0000-0000000000c1', 'ffffffff-0000-0000-0000-0000000000c1', 'A item', 1000),
  ('eeeeeeee-0000-0000-0000-0000000000c2', 'ffffffff-0000-0000-0000-0000000000c2', 'B item', 1000);
select public.adjust_stock(id, 10) from public.products where id::text like 'eeeeeeee-0000-0000-0000-0000000000c_';

select public.create_delivery(
  '{"id":"dddddddd-0000-0000-0000-0000000000c1","customer_name":"C","customer_phone":"99001122","address":"Addr"}',
  '[{"product_id":"eeeeeeee-0000-0000-0000-0000000000c1","quantity":1},
    {"product_id":"eeeeeeee-0000-0000-0000-0000000000c2","quantity":1}]');
select public.assign_delivery('dddddddd-0000-0000-0000-0000000000c1', '22222222-2222-2222-2222-222222222222');

select is(public.get_delivery_bank_accounts('dddddddd-0000-0000-0000-0000000000c1'),
          array['1111 Хаан банк A'], 'admin gets the accounts of the delivery brands (no-account brand skipped)');

select throws_ok($$ update public.factories set bank_account = '  ' where id = 'ffffffff-0000-0000-0000-0000000000c2' $$,
                 '23514', null, 'blank account is rejected');

select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select is(public.get_delivery_bank_accounts('dddddddd-0000-0000-0000-0000000000c1'),
          array['1111 Хаан банк A'], 'assigned courier gets the account');
select is((select count(*)::int from public.factories), 0, 'courier still cannot read factories');

select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.get_delivery_bank_accounts('dddddddd-0000-0000-0000-0000000000c1') $$,
                 'NOT_AUTHORIZED', 'other courier is refused');

-- Delivery without products → empty list
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.create_delivery(
  '{"id":"dddddddd-0000-0000-0000-0000000000c2","customer_name":"C","customer_phone":"99001122","address":"Addr"}', '[]');
select is(public.get_delivery_bank_accounts('dddddddd-0000-0000-0000-0000000000c2'), '{}'::text[], 'no products → no accounts');

select * from finish();
rollback;
