-- =============================================================
-- 0007 · Assignment RPCs
--
-- Concurrency model: every ownership change is a single
-- conditional UPDATE (`WHERE status = <expected>`) or a
-- `SELECT … FOR UPDATE` followed by checks. Under READ COMMITTED
-- a concurrent transaction waits on the row lock, re-evaluates
-- the WHERE clause and updates 0 rows. The partial unique index
-- delivery_assignments_one_active_idx is a second safety net.
-- =============================================================

-- Close the delivery's active assignment (if any).
create or replace function private.close_active_assignment(
  p_delivery_id uuid,
  p_end_reason  public.assignment_end,
  p_end_note    text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_courier_id uuid;
begin
  update public.delivery_assignments
     set ended_at = now(),
         end_reason = p_end_reason,
         end_note = p_end_note,
         ended_by = auth.uid()
   where delivery_id = p_delivery_id
     and ended_at is null
  returning courier_id into v_courier_id;
  return v_courier_id;
end;
$$;

-- Distinguish "does not exist" from "not in the expected state".
create or replace function private.raise_delivery_state_error(p_delivery_id uuid, p_default text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.deliveries where id = p_delivery_id) then
    raise exception 'DELIVERY_NOT_FOUND';
  end if;
  raise exception '%', p_default;
end;
$$;

-- -------------------------------------------------------------
-- Courier: list unassigned deliveries (customer phone hidden, D3)
-- -------------------------------------------------------------
create or replace function public.list_available_deliveries()
returns table (
  id                  uuid,
  code                text,
  address             text,
  address_note        text,
  latitude            double precision,
  longitude           double precision,
  package_description text,
  amount_due          numeric,
  scheduled_date      date,
  created_at          timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_courier();
  return query
    select d.id, d.code, d.address, d.address_note, d.latitude, d.longitude,
           d.package_description, d.amount_due, d.scheduled_date, d.created_at
    from public.deliveries d
    where d.status = 'UNASSIGNED'
    order by d.scheduled_date nulls last, d.created_at;
end;
$$;

-- -------------------------------------------------------------
-- Courier: claim an unassigned delivery
-- -------------------------------------------------------------
create or replace function public.claim_delivery(p_delivery_id uuid)
returns public.deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := private.assert_courier();
  v_delivery public.deliveries;
begin
  perform private.set_status_note(null);

  update public.deliveries
     set status = 'ASSIGNED', courier_id = v_uid, assigned_at = now()
   where id = p_delivery_id
     and status = 'UNASSIGNED'
  returning * into v_delivery;

  if not found then
    perform private.raise_delivery_state_error(p_delivery_id, 'DELIVERY_NOT_AVAILABLE');
  end if;

  insert into public.delivery_assignments (delivery_id, courier_id, start_action, started_by)
  values (p_delivery_id, v_uid, 'CLAIMED', v_uid);

  return v_delivery;
end;
$$;

-- -------------------------------------------------------------
-- Admin: assign an unassigned delivery
-- -------------------------------------------------------------
create or replace function public.assign_delivery(p_delivery_id uuid, p_courier_id uuid)
returns public.deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := private.assert_admin();
  v_delivery public.deliveries;
begin
  perform private.assert_target_courier(p_courier_id);
  perform private.set_status_note(null);

  update public.deliveries
     set status = 'ASSIGNED', courier_id = p_courier_id, assigned_at = now()
   where id = p_delivery_id
     and status = 'UNASSIGNED'
  returning * into v_delivery;

  if not found then
    perform private.raise_delivery_state_error(p_delivery_id, 'DELIVERY_NOT_AVAILABLE');
  end if;

  insert into public.delivery_assignments (delivery_id, courier_id, start_action, started_by)
  values (p_delivery_id, p_courier_id, 'ASSIGNED', v_uid);

  perform private.notify(p_courier_id, 'DELIVERY_ASSIGNED',
    'Шинэ хүргэлт оноогдлоо', v_delivery.code || ' · ' || v_delivery.address, p_delivery_id);

  return v_delivery;
end;
$$;

-- -------------------------------------------------------------
-- Admin: reassign an ASSIGNED delivery to another courier.
-- IN_PROGRESS deliveries can never be reassigned this way.
-- -------------------------------------------------------------
create or replace function public.reassign_delivery(
  p_delivery_id uuid,
  p_courier_id  uuid,
  p_reason      text
)
returns public.deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := private.assert_admin();
  v_reason      text := private.require_reason(p_reason);
  v_delivery    public.deliveries;
  v_old_courier uuid;
begin
  perform private.assert_target_courier(p_courier_id);

  select * into v_delivery from public.deliveries where id = p_delivery_id for update;
  if not found then
    raise exception 'DELIVERY_NOT_FOUND';
  end if;
  if v_delivery.status <> 'ASSIGNED' then
    raise exception 'INVALID_TRANSITION';
  end if;
  if v_delivery.courier_id = p_courier_id then
    raise exception 'SAME_COURIER';
  end if;

  v_old_courier := v_delivery.courier_id;

  perform private.close_active_assignment(p_delivery_id, 'REASSIGNED', v_reason);

  update public.deliveries
     set courier_id = p_courier_id, assigned_at = now()
   where id = p_delivery_id
  returning * into v_delivery;

  insert into public.delivery_assignments
    (delivery_id, courier_id, start_action, previous_courier_id, start_note, started_by)
  values
    (p_delivery_id, p_courier_id, 'REASSIGNED', v_old_courier, v_reason, v_uid);

  perform private.notify(v_old_courier, 'DELIVERY_REMOVED',
    'Хүргэлт өөр курьерт шилжлээ', v_delivery.code || ': ' || v_reason, p_delivery_id);
  perform private.notify(p_courier_id, 'DELIVERY_ASSIGNED',
    'Шинэ хүргэлт оноогдлоо', v_delivery.code || ' · ' || v_delivery.address, p_delivery_id);

  return v_delivery;
end;
$$;

-- -------------------------------------------------------------
-- Admin: put an ASSIGNED delivery back to the pool
-- -------------------------------------------------------------
create or replace function public.unassign_delivery(p_delivery_id uuid, p_reason text)
returns public.deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := private.assert_admin();
  v_reason      text := private.require_reason(p_reason);
  v_delivery    public.deliveries;
  v_old_courier uuid;
begin
  select * into v_delivery from public.deliveries where id = p_delivery_id for update;
  if not found then
    raise exception 'DELIVERY_NOT_FOUND';
  end if;
  if v_delivery.status <> 'ASSIGNED' then
    raise exception 'INVALID_TRANSITION';
  end if;

  v_old_courier := v_delivery.courier_id;

  perform private.close_active_assignment(p_delivery_id, 'UNASSIGNED', v_reason);
  perform private.set_status_note(v_reason);

  update public.deliveries
     set status = 'UNASSIGNED', courier_id = null, assigned_at = null
   where id = p_delivery_id
  returning * into v_delivery;

  perform private.notify(v_old_courier, 'DELIVERY_REMOVED',
    'Хүргэлт таниас хасагдлаа', v_delivery.code || ': ' || v_reason, p_delivery_id);

  return v_delivery;
end;
$$;

-- -------------------------------------------------------------
-- Courier: return own ASSIGNED delivery (decision D1).
-- Not allowed once IN_PROGRESS. Reason is mandatory.
-- -------------------------------------------------------------
create or replace function public.return_delivery(p_delivery_id uuid, p_reason text)
returns public.deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := private.assert_courier();
  v_reason   text := private.require_reason(p_reason);
  v_delivery public.deliveries;
begin
  select * into v_delivery from public.deliveries where id = p_delivery_id for update;
  if not found then
    raise exception 'DELIVERY_NOT_FOUND';
  end if;
  if v_delivery.courier_id is distinct from v_uid then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if v_delivery.status <> 'ASSIGNED' then
    raise exception 'INVALID_TRANSITION';
  end if;

  perform private.close_active_assignment(p_delivery_id, 'RETURNED', v_reason);
  perform private.set_status_note(v_reason);

  update public.deliveries
     set status = 'UNASSIGNED', courier_id = null, assigned_at = null
   where id = p_delivery_id
  returning * into v_delivery;

  return v_delivery;
end;
$$;

-- -------------------------------------------------------------
-- Function privileges: authenticated only (role checked inside)
-- -------------------------------------------------------------
revoke all on function public.list_available_deliveries()            from public, anon;
revoke all on function public.claim_delivery(uuid)                   from public, anon;
revoke all on function public.assign_delivery(uuid, uuid)            from public, anon;
revoke all on function public.reassign_delivery(uuid, uuid, text)    from public, anon;
revoke all on function public.unassign_delivery(uuid, text)          from public, anon;
revoke all on function public.return_delivery(uuid, text)            from public, anon;

grant execute on function public.list_available_deliveries()         to authenticated;
grant execute on function public.claim_delivery(uuid)                to authenticated;
grant execute on function public.assign_delivery(uuid, uuid)         to authenticated;
grant execute on function public.reassign_delivery(uuid, uuid, text) to authenticated;
grant execute on function public.unassign_delivery(uuid, text)       to authenticated;
grant execute on function public.return_delivery(uuid, text)         to authenticated;
