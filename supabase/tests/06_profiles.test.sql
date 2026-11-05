-- Profile creation from auth.users, matching how GoTrue's admin API behaves
-- (insert first, role added to app_metadata by a later UPDATE).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- 1. Role present at insert time
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000000', '55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated',
        'a@test.local', '{"role":"COURIER"}', '{"full_name":"Insert Courier","phone":"99000055"}');
select results_eq(
  $$ select role::text, full_name, phone from public.profiles where id = '55555555-5555-5555-5555-555555555555' $$,
  $$ values ('COURIER', 'Insert Courier', '99000055') $$,
  'profile created when role is set on insert');

-- 2. GoTrue admin API: insert without role, then UPDATE app_metadata
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000000', '66666666-6666-6666-6666-666666666666', 'authenticated', 'authenticated',
        'b@test.local', '{"provider":"email"}', '{"full_name":"Api Courier"}');
select is((select count(*)::int from public.profiles where id = '66666666-6666-6666-6666-666666666666'), 0,
  'no profile while app_metadata has no role');

update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"COURIER"}'
 where id = '66666666-6666-6666-6666-666666666666';
select results_eq(
  $$ select role::text, full_name from public.profiles where id = '66666666-6666-6666-6666-666666666666' $$,
  $$ values ('COURIER', 'Api Courier') $$,
  'profile created when role arrives via UPDATE');

-- 3. Changing app_metadata role later never changes an existing profile
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"ADMIN"}'
 where id = '66666666-6666-6666-6666-666666666666';
select is((select role::text from public.profiles where id = '66666666-6666-6666-6666-666666666666'), 'COURIER',
  'existing profile role is never changed by app_metadata');

-- 4. Unknown role → no profile
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data)
values ('00000000-0000-0000-0000-000000000000', '77777777-7777-7777-7777-777777777777', 'authenticated', 'authenticated',
        'c@test.local', '{"role":"SUPERUSER"}');
select is((select count(*)::int from public.profiles where id = '77777777-7777-7777-7777-777777777777'), 0,
  'unknown role gets no profile');

select * from finish();
rollback;
