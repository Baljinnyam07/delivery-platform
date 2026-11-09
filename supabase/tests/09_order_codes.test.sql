-- Order codes (brand letter + YYMMDD + daily count) and delivery fee.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

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
-- Today's code body in Ulaanbaatar time, e.g. 261109
create function pg_temp.today() returns text language sql as $$
  select to_char((now() at time zone 'Asia/Ulaanbaatar')::date, 'YYMMDD');
$$;
create function pg_temp.mk_delivery(p_items jsonb, p_fee numeric default 0, p_method public.payment_method default null)
returns text language plpgsql as $$
declare v_id uuid;
begin
  -- Separate statements: the new row is visible to the lookup.
  v_id := public.create_delivery(
    jsonb_build_object('customer_name', 'C', 'customer_phone', '99001122', 'address', 'Addr', 'delivery_fee', p_fee),
    p_items, null, p_method);
  return (select code from public.deliveries where id = v_id);
end;
$$;

-- [amount_due, delivery_fee, payment_status as 1/0] of a newly created delivery
create function pg_temp.mk_amounts(p_items jsonb, p_fee numeric, p_method public.payment_method default null)
returns numeric[] language plpgsql as $$
declare v_code text := pg_temp.mk_delivery(p_items, p_fee, p_method);
begin
  return (select array[amount_due, delivery_fee, (payment_status = 'PAID')::int]
          from public.deliveries where code = v_code);
end;
$$;

-- Counters are per day; start from a clean slate for today.
delete from private.delivery_code_counters;

select pg_temp.mk('11111111-1111-1111-1111-111111111111', 'ADMIN');
set local role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');

insert into public.factories (id, name, code_letter) values
  ('ffffffff-0000-0000-0000-00000000000a', 'Brand N', 'N'),
  ('ffffffff-0000-0000-0000-00000000000b', 'Brand F', 'F'),
  ('ffffffff-0000-0000-0000-00000000000c', 'No letter', null);
insert into public.products (id, factory_id, name, unit_price) values
  ('eeeeeeee-0000-0000-0000-00000000000a', 'ffffffff-0000-0000-0000-00000000000a', 'N product', 5000),
  ('eeeeeeee-0000-0000-0000-00000000000b', 'ffffffff-0000-0000-0000-00000000000b', 'F product', 7000),
  ('eeeeeeee-0000-0000-0000-00000000000c', 'ffffffff-0000-0000-0000-00000000000c', 'X product', 1000);
select public.adjust_stock(id, 100) from public.products where id::text like 'eeeeeeee-0000-0000-0000-00000000000_';

-- Codes
select is(pg_temp.mk_delivery('[{"product_id":"eeeeeeee-0000-0000-0000-00000000000a","quantity":1}]'),
  'N' || pg_temp.today() || '-001', 'first Brand N order of the day');
select is(pg_temp.mk_delivery('[{"product_id":"eeeeeeee-0000-0000-0000-00000000000a","quantity":1}]'),
  'N' || pg_temp.today() || '-002', 'second Brand N order counts up');
select is(pg_temp.mk_delivery('[{"product_id":"eeeeeeee-0000-0000-0000-00000000000b","quantity":1}]'),
  'F' || pg_temp.today() || '-001', 'each brand has its own daily count');
select is(pg_temp.mk_delivery('[{"product_id":"eeeeeeee-0000-0000-0000-00000000000a","quantity":1},
                                 {"product_id":"eeeeeeee-0000-0000-0000-00000000000b","quantity":1}]'),
  'M' || pg_temp.today() || '-001', 'mixed brands get M');
select is(pg_temp.mk_delivery('[]'), 'D' || pg_temp.today() || '-001', 'no products get D');
select is(pg_temp.mk_delivery('[{"product_id":"eeeeeeee-0000-0000-0000-00000000000c","quantity":1}]'),
  'D' || pg_temp.today() || '-002', 'brand without a letter gets D');

select throws_ok($$ select public.create_delivery(
    '{"customer_name":"C","customer_phone":"99001122","address":"Addr"}',
    '[{"product_id":"eeeeeeee-0000-0000-0000-00000000000a","quantity":1000}]') $$,
  'P0001', 'NOT_ENOUGH_STOCK', 'failed create is rejected');
select is(pg_temp.mk_delivery('[{"product_id":"eeeeeeee-0000-0000-0000-00000000000a","quantity":1}]'),
  'N' || pg_temp.today() || '-003', 'failed create does not leave a gap');

select throws_ok($$ update public.factories set code_letter = 'M' where name = 'No letter' $$,
  '23514', null, 'M and D are reserved letters');
select throws_ok($$ update public.factories set code_letter = 'N' where name = 'No letter' $$,
  '23505', null, 'a letter belongs to one brand');

-- Delivery fee
select is(pg_temp.mk_amounts('[{"product_id":"eeeeeeee-0000-0000-0000-00000000000b","quantity":2}]', 3000),
  array[17000.00, 3000.00, 0]::numeric[], 'total = goods (2 x 7000) + fee');
select is(pg_temp.mk_amounts('[]', 4000),
  array[4000.00, 4000.00, 0]::numeric[], 'fee alone without products');
select throws_ok($$ update public.deliveries set delivery_fee = amount_due + 1
                    where code = 'F' || pg_temp.today() || '-002' $$,
  '23514', null, 'fee cannot exceed the total');

select is(pg_temp.mk_amounts('[{"product_id":"eeeeeeee-0000-0000-0000-00000000000b","quantity":1}]', 2000, 'CASH'),
  array[9000.00, 2000.00, 1]::numeric[], 'prepaid delivery with fee is paid in full');
select throws_ok($$ update public.deliveries set delivery_fee = 0
                    where code = 'F' || pg_temp.today() || '-003' $$,
  'P0001', 'AMOUNT_LOCKED', 'fee is locked once paid');

select * from finish();
rollback;
