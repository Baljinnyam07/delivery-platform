-- Push dispatch trigger: queues an HTTP call (pg_net) only when it should.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

create function pg_temp.mk(p_id uuid, p_role text) returns void language sql as $$
  insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
          p_id::text || '@test.local', jsonb_build_object('role', p_role),
          jsonb_build_object('full_name', p_role || ' test'));
$$;
create function pg_temp.queued() returns int language sql as $$
  select count(*)::int from net.http_request_queue;
$$;
create function pg_temp.notify(p_recipient uuid) returns uuid language sql as $$
  insert into public.notifications (recipient_id, type, title, body)
  values (p_recipient, 'DELIVERY_ASSIGNED', 't', 'b') returning id;
$$;

-- Known Vault config for this test (rolled back afterwards).
delete from vault.secrets where name in ('push_function_url', 'push_webhook_secret');
select vault.create_secret('http://example.test/functions/v1/send-push', 'push_function_url');
select vault.create_secret('test-secret', 'push_webhook_secret');

select pg_temp.mk('22222222-2222-2222-2222-222222222222', 'COURIER');
select pg_temp.mk('33333333-3333-3333-3333-333333333333', 'COURIER');
update public.profiles set expo_push_token = 'ExponentPushToken[test]'
 where id = '22222222-2222-2222-2222-222222222222';

create temp table before as select pg_temp.queued() as n;

-- 1. courier with token → one queued request carrying only the notification id
create temp table sent as select pg_temp.notify('22222222-2222-2222-2222-222222222222') as id;
select is(pg_temp.queued(), (select n + 1 from before), 'push queued for courier with a token');

select is(
  (select convert_from(q.body, 'utf8')::jsonb ->> 'notification_id'
     from net.http_request_queue q order by q.id desc limit 1),
  (select id::text from sent),
  'request body carries only the notification id');

select is(
  (select q.headers ->> 'x-webhook-secret' from net.http_request_queue q order by q.id desc limit 1),
  'test-secret',
  'request is authenticated with the Vault shared secret');

-- 2. courier without token → nothing queued
select pg_temp.notify('33333333-3333-3333-3333-333333333333');
select is(pg_temp.queued(), (select n + 1 from before), 'no push for courier without a token');

-- 3. inactive courier → nothing queued
update public.profiles set is_active = false where id = '22222222-2222-2222-2222-222222222222';
select pg_temp.notify('22222222-2222-2222-2222-222222222222');
select is(pg_temp.queued(), (select n + 1 from before), 'no push for an inactive courier');

-- 4. Vault not configured → push disabled, business insert still succeeds
update public.profiles set is_active = true where id = '22222222-2222-2222-2222-222222222222';
delete from vault.secrets where name = 'push_function_url';
select lives_ok($$ select pg_temp.notify('22222222-2222-2222-2222-222222222222') $$,
  'missing push config never blocks notification inserts');

select * from finish();
rollback;
