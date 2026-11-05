-- =============================================================
-- Local development seed. NEVER run against production.
--
-- Test accounts (local only), password for all: password123
--   admin@delivery.test     ADMIN
--   bat@delivery.test       COURIER
--   saraa@delivery.test     COURIER
--   tuya@delivery.test      COURIER
--
-- State changes go through the real RPC functions (impersonating
-- users via request.jwt.claims) so history/audit rows are realistic.
-- =============================================================

create or replace function pg_temp.seed_user(p_id uuid, p_email text, p_role text, p_name text, p_phone text)
returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', p_role),
    jsonb_build_object('full_name', p_name, 'phone', p_phone),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text,
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
end $$;

create or replace function pg_temp.act_as(p_id uuid)
returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_id, 'role', 'authenticated')::text, false);
$$;

select pg_temp.seed_user('00000000-0000-0000-0000-00000000a001', 'admin@delivery.test', 'ADMIN',   'Admin User',  '99000001');
select pg_temp.seed_user('00000000-0000-0000-0000-00000000c001', 'bat@delivery.test',   'COURIER', 'Bat-Erdene',  '99110001');
select pg_temp.seed_user('00000000-0000-0000-0000-00000000c002', 'saraa@delivery.test', 'COURIER', 'Saraa',       '99110002');
select pg_temp.seed_user('00000000-0000-0000-0000-00000000c003', 'tuya@delivery.test',  'COURIER', 'Tuya',        '99110003');

-- Deliveries are created by the admin.
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');

insert into public.deliveries (id, customer_name, customer_phone, address, address_note, package_description, amount_due, scheduled_date)
values
  ('00000000-0000-0000-0000-0000000d0001', 'Enkhjargal', '88001101', 'Sukhbaatar district, 1st khoroo, Seoul St 21', 'Entrance 2, floor 5', 'Documents',      0,      current_date),
  ('00000000-0000-0000-0000-0000000d0002', 'Ganbold',    '88001102', 'Khan-Uul district, 15th khoroo, Zaisan 7',     null,                  'Small box',      25000,  current_date),
  ('00000000-0000-0000-0000-0000000d0003', 'Oyuunaa',    '88001103', 'Bayanzurkh district, 26th khoroo, Building 54', 'Call on arrival',    'Flowers',        45000,  current_date),
  ('00000000-0000-0000-0000-0000000d0004', 'Temuulen',   '88001104', 'Chingeltei district, 4th khoroo, Building 12', null,                  'Electronics',    120000, current_date),
  ('00000000-0000-0000-0000-0000000d0005', 'Nomin',      '88001105', 'Songinokhairkhan district, 20th khoroo, 3-41', null,                  'Clothes',        60000,  current_date),
  ('00000000-0000-0000-0000-0000000d0006', 'Bilguun',    '88001106', 'Bayangol district, 3rd khoroo, Building 8',    'Office, 2nd floor',   'Food',           18000,  current_date),
  ('00000000-0000-0000-0000-0000000d0007', 'Solongo',    '88001107', 'Sukhbaatar district, 8th khoroo, Building 30', null,                  'Cosmetics',      35000,  current_date + 1),
  ('00000000-0000-0000-0000-0000000d0008', 'Munkh-Od',   '88001108', 'Khan-Uul district, 11th khoroo, Building 101', null,                  'Book',           15000,  current_date - 1);

-- Admin assignments
select public.assign_delivery('00000000-0000-0000-0000-0000000d0002', '00000000-0000-0000-0000-00000000c001');
select public.assign_delivery('00000000-0000-0000-0000-0000000d0003', '00000000-0000-0000-0000-00000000c001');
select public.assign_delivery('00000000-0000-0000-0000-0000000d0004', '00000000-0000-0000-0000-00000000c002');
select public.assign_delivery('00000000-0000-0000-0000-0000000d0008', '00000000-0000-0000-0000-00000000c003');

-- Courier Saraa claims one
select pg_temp.act_as('00000000-0000-0000-0000-00000000c002');
select public.claim_delivery('00000000-0000-0000-0000-0000000d0005');

-- Courier Bat: in progress + delivered with cash payment
select pg_temp.act_as('00000000-0000-0000-0000-00000000c001');
select public.start_delivery('00000000-0000-0000-0000-0000000d0003');
select public.start_delivery('00000000-0000-0000-0000-0000000d0002');
select public.record_payment('00000000-0000-0000-0000-0000000d0002', 'CASH', 25000);
select public.complete_delivery('00000000-0000-0000-0000-0000000d0002');

-- Courier Tuya: delivered, not yet paid (payment independent of status)
select pg_temp.act_as('00000000-0000-0000-0000-00000000c003');
select public.start_delivery('00000000-0000-0000-0000-0000000d0008');
select public.complete_delivery('00000000-0000-0000-0000-0000000d0008');

-- Admin cancels one
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');
select public.cancel_delivery('00000000-0000-0000-0000-0000000d0007', 'Customer cancelled the order');

-- Remaining UNASSIGNED: d0001, d0006
select set_config('request.jwt.claims', '', false);
