-- =============================================================
-- 0005 · notifications
-- Rows are created inside the same transaction as the business
-- change. Push delivery (Edge Function) is added in Phase 6.
-- =============================================================

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type         text not null check (type in (
                 'DELIVERY_ASSIGNED',
                 'DELIVERY_REMOVED',
                 'DELIVERY_CANCELLED',
                 'DELIVERY_AVAILABLE'
               )),
  title        text not null,
  body         text not null,
  delivery_id  uuid references public.deliveries (id),
  read_at      timestamptz,
  push_sent_at timestamptz,
  push_error   text,
  created_at   timestamptz not null default now()
);

create index notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

create index notifications_throttle_idx
  on public.notifications (recipient_id, type, created_at desc);

create or replace function private.notify(
  p_recipient_id uuid,
  p_type         text,
  p_title        text,
  p_body         text,
  p_delivery_id  uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (recipient_id, type, title, body, delivery_id)
  values (p_recipient_id, p_type, p_title, p_body, p_delivery_id);
$$;

-- -------------------------------------------------------------
-- "Delivery available" broadcast with anti-spam throttle.
-- Fires whenever a delivery BECOMES unassigned (created, returned,
-- unassigned). Each active courier gets at most one such
-- notification per 10 minutes; the previous courier is excluded.
-- -------------------------------------------------------------
create or replace function private.notify_delivery_available()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_courier uuid := case when tg_op = 'UPDATE' then old.courier_id end;
begin
  if new.status <> 'UNASSIGNED' then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.status = 'UNASSIGNED' then
    return null;
  end if;

  insert into public.notifications (recipient_id, type, title, body)
  select p.id,
         'DELIVERY_AVAILABLE',
         'New deliveries available',
         'Open the app to see deliveries you can claim.'
  from public.profiles p
  where p.role = 'COURIER'
    and p.is_active
    and p.id is distinct from v_previous_courier
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = p.id
        and n.type = 'DELIVERY_AVAILABLE'
        and n.created_at > now() - interval '10 minutes'
    );

  return null;
end;
$$;

create trigger deliveries_notify_available
  after insert or update of status on public.deliveries
  for each row execute function private.notify_delivery_available();
