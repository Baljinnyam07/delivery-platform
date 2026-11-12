-- =============================================================
-- 0016 · "Delivery available" push for every delivery
--
-- D5 change (approved 2026-11-12): drop the 10-minute throttle. Every
-- delivery that becomes UNASSIGNED (created, returned, unassigned) now
-- notifies each active courier, and the text names the delivery
-- (code + address; the customer phone stays hidden per D3).
-- The previous courier of a returned/unassigned delivery is still excluded.
-- =============================================================

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
         'Шинэ хүргэлт: ' || new.code,
         left(new.address, 140)
  from public.profiles p
  where p.role = 'COURIER'
    and p.is_active
    and p.id is distinct from v_previous_courier;

  return null;
end;
$$;
