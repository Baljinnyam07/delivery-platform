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

select pg_temp.seed_user('00000000-0000-0000-0000-00000000a001', 'admin@delivery.test', 'ADMIN',   'Админ',       '99000001');
select pg_temp.seed_user('00000000-0000-0000-0000-00000000c001', 'bat@delivery.test',   'COURIER', 'Bat-Erdene',  '99110001');
select pg_temp.seed_user('00000000-0000-0000-0000-00000000c002', 'saraa@delivery.test', 'COURIER', 'Saraa',       '99110002');
select pg_temp.seed_user('00000000-0000-0000-0000-00000000c003', 'tuya@delivery.test',  'COURIER', 'Tuya',        '99110003');

-- Deliveries are created by the admin.
select pg_temp.act_as('00000000-0000-0000-0000-00000000a001');

insert into public.deliveries (id, customer_name, customer_phone, address, address_note, package_description, amount_due, scheduled_date)
values
  ('00000000-0000-0000-0000-0000000d0001', 'Энхжаргал',  '88001101', 'СБД, 1-р хороо, Сөүлийн гудамж 21',      '2-р орц, 5 давхар',   'Бичиг баримт',      0,      current_date),
  ('00000000-0000-0000-0000-0000000d0002', 'Ганболд',    '88001102', 'ХУД, 15-р хороо, Зайсан 7',              null,                  'Жижиг хайрцаг',      25000,  current_date),
  ('00000000-0000-0000-0000-0000000d0003', 'Оюунаа',     '88001103', 'БЗД, 26-р хороо, 54-р байр',             'Ирэхээсээ өмнө залгана уу', 'Цэцэг',        45000,  current_date),
  ('00000000-0000-0000-0000-0000000d0004', 'Тэмүүлэн',   '88001104', 'ЧД, 4-р хороо, 12-р байр',               null,                  'Электрон бараа',    120000, current_date),
  ('00000000-0000-0000-0000-0000000d0005', 'Номин',      '88001105', 'СХД, 20-р хороо, 3-41',                  null,                  'Хувцас',        60000,  current_date),
  ('00000000-0000-0000-0000-0000000d0006', 'Билгүүн',    '88001106', 'БГД, 3-р хороо, 8-р байр',               'Оффис, 2 давхар',     'Хоол',           18000,  current_date),
  ('00000000-0000-0000-0000-0000000d0007', 'Солонго',    '88001107', 'СБД, 8-р хороо, 30-р байр',              null,                  'Гоо сайхан',      35000,  current_date + 1),
  ('00000000-0000-0000-0000-0000000d0008', 'Мөнх-Од',    '88001108', 'ХУД, 11-р хороо, 101-р байр',            null,                  'Ном',           15000,  current_date - 1);

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
select public.cancel_delivery('00000000-0000-0000-0000-0000000d0007', 'Захиалагч захиалгаа цуцалсан');

-- Remaining UNASSIGNED: d0001, d0006
select set_config('request.jwt.claims', '', false);

-- Push dispatch (local only): DB → send-push Edge Function through Kong on the
-- Docker network. Must match [edge_runtime.secrets] in config.toml.
select vault.create_secret('http://supabase_kong_delivery-platform:8000/functions/v1/send-push', 'push_function_url', 'Local send-push URL');
select vault.create_secret('local-dev-push-secret', 'push_webhook_secret', 'Local development only');
