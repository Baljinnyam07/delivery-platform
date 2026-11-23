-- Expenses: per-brand or split equally, admin only, soft delete.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

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
create function pg_temp.alloc(p_expense uuid, p_factory uuid) returns numeric language sql as $$
  select amount from public.expense_allocations where expense_id = p_expense and factory_id = p_factory;
$$;

select pg_temp.mk('11111111-1111-1111-1111-111111111111', 'ADMIN');
select pg_temp.mk('22222222-2222-2222-2222-222222222222', 'COURIER');

-- Only the two test brands are active, oldest first.
update public.factories set is_active = false;
insert into public.factories (id, name, created_at) values
  ('ffffffff-0000-0000-0000-0000000000a1', 'Brand A', now() - interval '1 day'),
  ('ffffffff-0000-0000-0000-0000000000b1', 'Brand B', now());

set local role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');

-- Single-brand expense
select public.create_expense('eeeeeeee-0000-0000-0000-000000000001', '2026-11-20', 30000, 'Шатахуун',
                             'ffffffff-0000-0000-0000-0000000000b1');
select is(pg_temp.alloc('eeeeeeee-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-0000000000b1'),
          30000.00::numeric, 'brand expense goes to that brand only');
select is((select count(*)::int from public.expense_allocations
           where expense_id = 'eeeeeeee-0000-0000-0000-000000000001'), 1, 'one allocation row');

-- Shared expense, odd amount: 10,001 → 5,001 / 5,000 (remainder to the oldest brand)
select public.create_expense('eeeeeeee-0000-0000-0000-000000000002', '2026-11-21', 10001, ' Түрээс ');
select is(pg_temp.alloc('eeeeeeee-0000-0000-0000-000000000002', 'ffffffff-0000-0000-0000-0000000000a1'),
          5001.00::numeric, 'oldest brand gets the remainder');
select is(pg_temp.alloc('eeeeeeee-0000-0000-0000-000000000002', 'ffffffff-0000-0000-0000-0000000000b1'),
          5000.00::numeric, 'other brand gets the equal share');
select is((select description from public.expenses where id = 'eeeeeeee-0000-0000-0000-000000000002'),
          'Түрээс', 'description is trimmed');
select is((select factory_id from public.expenses where id = 'eeeeeeee-0000-0000-0000-000000000002'),
          null, 'shared expense has no factory');

-- Idempotent on id
select public.create_expense('eeeeeeee-0000-0000-0000-000000000002', '2026-11-21', 10001, 'Түрээс');
select is((select count(*)::int from public.expenses where id = 'eeeeeeee-0000-0000-0000-000000000002'), 1,
          'double submit creates one expense');

-- Validation
select throws_ok($$ select public.create_expense(null, '2026-11-21', 0, 'x') $$,
                 'EXPENSE_INVALID', 'amount must be positive');
select throws_ok($$ select public.create_expense(null, '2026-11-21', 100.5, 'x') $$,
                 'EXPENSE_INVALID', 'amount must be whole tögrög');
select throws_ok($$ select public.create_expense(null, '2026-11-21', 100, '  ') $$,
                 'EXPENSE_INVALID', 'description is required');

-- No direct writes
select throws_ok($$ insert into public.expenses (spent_on, amount, description) values ('2026-11-21', 1, 'x') $$,
                 '42501', null, 'no direct insert');

-- Void (soft delete)
select public.void_expense('eeeeeeee-0000-0000-0000-000000000001');
select isnt((select voided_at from public.expenses where id = 'eeeeeeee-0000-0000-0000-000000000001'),
            null, 'void keeps the row with a timestamp');
select throws_ok($$ select public.void_expense('eeeeeeee-0000-0000-0000-000000000001') $$,
                 'EXPENSE_NOT_FOUND', 'cannot void twice');

-- Courier: no access at all
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.create_expense(null, '2026-11-21', 100, 'x') $$,
                 'NOT_AUTHORIZED', 'courier cannot record expenses');

select * from finish();
rollback;
