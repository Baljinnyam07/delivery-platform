-- =============================================================
-- 0008 · Status, payment and courier management RPCs
-- =============================================================

-- -------------------------------------------------------------
-- Courier: ASSIGNED → IN_PROGRESS
-- -------------------------------------------------------------
create or replace function public.start_delivery(p_delivery_id uuid)
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
     set status = 'IN_PROGRESS', started_at = now()
   where id = p_delivery_id
     and status = 'ASSIGNED'
     and courier_id = v_uid
  returning * into v_delivery;

  if not found then
    perform private.raise_delivery_state_error(p_delivery_id, 'INVALID_TRANSITION');
  end if;

  return v_delivery;
end;
$$;

-- -------------------------------------------------------------
-- Courier: IN_PROGRESS → DELIVERED
-- -------------------------------------------------------------
create or replace function public.complete_delivery(p_delivery_id uuid, p_note text default null)
returns public.deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := private.assert_courier();
  v_note     text := nullif(btrim(p_note), '');
  v_delivery public.deliveries;
begin
  perform private.set_status_note(v_note);

  update public.deliveries
     set status = 'DELIVERED', delivered_at = now()
   where id = p_delivery_id
     and status = 'IN_PROGRESS'
     and courier_id = v_uid
  returning * into v_delivery;

  if not found then
    perform private.raise_delivery_state_error(p_delivery_id, 'INVALID_TRANSITION');
  end if;

  perform private.close_active_assignment(p_delivery_id, 'COMPLETED', v_note);

  return v_delivery;
end;
$$;

-- -------------------------------------------------------------
-- Admin: any status except DELIVERED / CANCELLED → CANCELLED
-- -------------------------------------------------------------
create or replace function public.cancel_delivery(p_delivery_id uuid, p_reason text)
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
  if v_delivery.status in ('DELIVERED', 'CANCELLED') then
    raise exception 'INVALID_TRANSITION';
  end if;

  v_old_courier := private.close_active_assignment(p_delivery_id, 'CANCELLED', v_reason);
  perform private.set_status_note(v_reason);

  -- courier_id is kept for history (who had it when it was cancelled).
  update public.deliveries
     set status = 'CANCELLED', cancelled_at = now(), cancel_reason = v_reason
   where id = p_delivery_id
  returning * into v_delivery;

  if v_old_courier is not null then
    perform private.notify(v_old_courier, 'DELIVERY_CANCELLED',
      'Хүргэлт цуцлагдлаа', v_delivery.code || ': ' || v_reason, p_delivery_id);
  end if;

  return v_delivery;
end;
$$;

-- -------------------------------------------------------------
-- Record one full payment (decision D4).
-- Courier: own delivery, IN_PROGRESS or DELIVERED.
-- Admin:   any non-cancelled delivery.
-- Delivery status is not touched (business rule 6).
-- -------------------------------------------------------------
create or replace function public.record_payment(
  p_delivery_id  uuid,
  p_method       public.payment_method,
  p_amount       numeric,
  p_receipt_path text default null,
  p_note         text default null
)
returns public.payment_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_is_admin boolean := private.is_admin();
  v_delivery public.deliveries;
  v_payment  public.payment_records;
begin
  if not v_is_admin then
    perform private.assert_courier();
  end if;

  select * into v_delivery from public.deliveries where id = p_delivery_id for update;
  if not found then
    raise exception 'DELIVERY_NOT_FOUND';
  end if;

  if not v_is_admin then
    if v_delivery.courier_id is distinct from v_uid then
      raise exception 'NOT_AUTHORIZED';
    end if;
    if v_delivery.status not in ('IN_PROGRESS', 'DELIVERED') then
      raise exception 'PAYMENT_NOT_ALLOWED';
    end if;
  end if;

  if v_delivery.status = 'CANCELLED' then
    raise exception 'PAYMENT_NOT_ALLOWED';
  end if;
  if v_delivery.payment_status = 'PAID' then
    raise exception 'PAYMENT_ALREADY_RECORDED';
  end if;
  if v_delivery.amount_due = 0 then
    raise exception 'PAYMENT_NOT_REQUIRED';
  end if;
  if p_method is null or p_amount is null or p_amount <> v_delivery.amount_due then
    raise exception 'AMOUNT_MISMATCH';
  end if;
  if p_receipt_path is not null and p_receipt_path not like p_delivery_id::text || '/%' then
    raise exception 'INVALID_RECEIPT_PATH';
  end if;

  begin
    insert into public.payment_records (delivery_id, amount, method, recorded_by, receipt_path, note)
    values (p_delivery_id, p_amount, p_method, v_uid, p_receipt_path, nullif(btrim(p_note), ''))
    returning * into v_payment;
  exception when unique_violation then
    raise exception 'PAYMENT_ALREADY_RECORDED';
  end;

  update public.deliveries
     set payment_status = 'PAID', payment_method = p_method
   where id = p_delivery_id;

  return v_payment;
end;
$$;

-- -------------------------------------------------------------
-- Admin: void a payment (correction). Never deletes.
-- -------------------------------------------------------------
create or replace function public.void_payment(p_payment_id uuid, p_reason text)
returns public.payment_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := private.assert_admin();
  v_reason  text := private.require_reason(p_reason);
  v_payment public.payment_records;
begin
  select * into v_payment from public.payment_records where id = p_payment_id for update;
  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;
  if v_payment.voided_at is not null then
    raise exception 'PAYMENT_ALREADY_VOIDED';
  end if;

  -- Lock the delivery too, so a concurrent record_payment waits.
  perform 1 from public.deliveries where id = v_payment.delivery_id for update;

  update public.payment_records
     set voided_at = now(), voided_by = v_uid, void_reason = v_reason
   where id = p_payment_id
  returning * into v_payment;

  update public.deliveries
     set payment_status = 'UNPAID', payment_method = null
   where id = v_payment.delivery_id;

  return v_payment;
end;
$$;

-- -------------------------------------------------------------
-- Admin: activate / deactivate a courier.
-- Deactivation is blocked while the courier has active deliveries.
-- -------------------------------------------------------------
create or replace function public.set_courier_active(p_courier_id uuid, p_active boolean)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  perform private.assert_admin();

  select * into v_profile from public.profiles where id = p_courier_id for update;
  if not found or v_profile.role <> 'COURIER' then
    raise exception 'COURIER_NOT_FOUND';
  end if;

  if not p_active and exists (
    select 1 from public.deliveries
    where courier_id = p_courier_id and status in ('ASSIGNED', 'IN_PROGRESS')
  ) then
    raise exception 'HAS_ACTIVE_DELIVERIES';
  end if;

  update public.profiles
     set is_active = p_active,
         expo_push_token = case when p_active then expo_push_token end
   where id = p_courier_id
  returning * into v_profile;

  return v_profile;
end;
$$;

-- -------------------------------------------------------------
-- Function privileges
-- -------------------------------------------------------------
revoke all on function public.start_delivery(uuid)                                          from public, anon;
revoke all on function public.complete_delivery(uuid, text)                                 from public, anon;
revoke all on function public.cancel_delivery(uuid, text)                                   from public, anon;
revoke all on function public.record_payment(uuid, public.payment_method, numeric, text, text) from public, anon;
revoke all on function public.void_payment(uuid, text)                                      from public, anon;
revoke all on function public.set_courier_active(uuid, boolean)                             from public, anon;

grant execute on function public.start_delivery(uuid)                                          to authenticated;
grant execute on function public.complete_delivery(uuid, text)                                 to authenticated;
grant execute on function public.cancel_delivery(uuid, text)                                   to authenticated;
grant execute on function public.record_payment(uuid, public.payment_method, numeric, text, text) to authenticated;
grant execute on function public.void_payment(uuid, text)                                      to authenticated;
grant execute on function public.set_courier_active(uuid, boolean)                             to authenticated;
