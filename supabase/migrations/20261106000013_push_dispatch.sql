-- =============================================================
-- 0013 · Push dispatch
--
-- Every notification row for a courier with a push token triggers an
-- HTTP call to the `send-push` Edge Function. pg_net queues the request
-- and sends it only AFTER the transaction commits, so a rolled-back
-- business change never produces a push, and a failing push never rolls
-- back business logic.
--
-- Only the notification id is sent; the function reads the rest with the
-- service role. URL and shared secret live in Supabase Vault:
--   push_function_url   e.g. https://<ref>.supabase.co/functions/v1/send-push
--   push_webhook_secret same value as the function's PUSH_WEBHOOK_SECRET
-- If either is missing, push is simply disabled.
-- =============================================================

create extension if not exists pg_net with schema extensions;

create or replace function private.dispatch_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  if not exists (
    select 1 from public.profiles
    where id = new.recipient_id and is_active and expo_push_token is not null
  ) then
    return null;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    timeout_milliseconds := 10000
  );
  return null;
end;
$$;

create trigger notifications_dispatch_push
  after insert on public.notifications
  for each row execute function private.dispatch_push();
