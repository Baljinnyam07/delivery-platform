-- =============================================================
-- 0011 · Admin statistics RPCs (dashboard, couriers, reports)
-- All periods are half-open: [p_from, p_to).
-- Calendar days are Asia/Ulaanbaatar (decision D7).
-- =============================================================

create index if not exists deliveries_delivered_at_idx on public.deliveries (delivered_at);
create index if not exists deliveries_created_at_idx on public.deliveries (created_at);

-- -------------------------------------------------------------
-- Dashboard KPIs
-- *_now      : current snapshot
-- created/delivered/cancelled/collected_* : within the period
-- unpaid_*   : all outstanding receivables (not cancelled, amount > 0)
-- -------------------------------------------------------------
create or replace function public.get_dashboard_stats(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'INVALID_RANGE';
  end if;

  return jsonb_build_object(
    'created',          (select count(*) from public.deliveries where created_at >= p_from and created_at < p_to),
    'delivered',        (select count(*) from public.deliveries where delivered_at >= p_from and delivered_at < p_to),
    'cancelled',        (select count(*) from public.deliveries where cancelled_at >= p_from and cancelled_at < p_to),
    'unassigned_now',   (select count(*) from public.deliveries where status = 'UNASSIGNED'),
    'assigned_now',     (select count(*) from public.deliveries where status = 'ASSIGNED'),
    'in_progress_now',  (select count(*) from public.deliveries where status = 'IN_PROGRESS'),
    'unpaid_count',     (select count(*) from public.deliveries
                          where payment_status = 'UNPAID' and amount_due > 0 and status <> 'CANCELLED'),
    'unpaid_amount',    (select coalesce(sum(amount_due), 0) from public.deliveries
                          where payment_status = 'UNPAID' and amount_due > 0 and status <> 'CANCELLED'),
    'collected_cash',   (select coalesce(sum(amount), 0) from public.payment_records
                          where voided_at is null and method = 'CASH' and recorded_at >= p_from and recorded_at < p_to),
    'collected_transfer', (select coalesce(sum(amount), 0) from public.payment_records
                          where voided_at is null and method = 'BANK_TRANSFER' and recorded_at >= p_from and recorded_at < p_to)
  );
end;
$$;

-- -------------------------------------------------------------
-- Per-courier workload and performance.
-- cash_collected = non-voided CASH payments recorded by the courier
-- in the period (what the courier should hand over).
-- -------------------------------------------------------------
create or replace function public.get_courier_stats(p_from timestamptz, p_to timestamptz)
returns table (
  courier_id            uuid,
  full_name             text,
  phone                 text,
  is_active             boolean,
  assigned_now          integer,
  in_progress_now       integer,
  delivered_count       integer,
  avg_delivery_minutes  integer,
  cash_collected        numeric,
  transfer_collected    numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'INVALID_RANGE';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.phone,
    p.is_active,
    (select count(*) from public.deliveries d where d.courier_id = p.id and d.status = 'ASSIGNED')::integer,
    (select count(*) from public.deliveries d where d.courier_id = p.id and d.status = 'IN_PROGRESS')::integer,
    (select count(*) from public.deliveries d
      where d.courier_id = p.id and d.delivered_at >= p_from and d.delivered_at < p_to)::integer,
    (select round(avg(extract(epoch from d.delivered_at - d.started_at) / 60))
       from public.deliveries d
      where d.courier_id = p.id and d.delivered_at >= p_from and d.delivered_at < p_to
        and d.started_at is not null)::integer,
    (select coalesce(sum(r.amount), 0) from public.payment_records r
      where r.recorded_by = p.id and r.voided_at is null and r.method = 'CASH'
        and r.recorded_at >= p_from and r.recorded_at < p_to),
    (select coalesce(sum(r.amount), 0) from public.payment_records r
      where r.recorded_by = p.id and r.voided_at is null and r.method = 'BANK_TRANSFER'
        and r.recorded_at >= p_from and r.recorded_at < p_to)
  from public.profiles p
  where p.role = 'COURIER'
  order by p.is_active desc, p.full_name;
end;
$$;

-- -------------------------------------------------------------
-- Daily report for [p_from, p_to] inclusive calendar days (UB time).
-- -------------------------------------------------------------
create or replace function public.get_daily_report(p_from date, p_to date)
returns table (
  day       date,
  created   integer,
  delivered integer,
  cancelled integer,
  cash      numeric,
  transfer  numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'INVALID_RANGE';
  end if;

  return query
  with days as (
    select g::date as day from generate_series(p_from, p_to, interval '1 day') g
  ),
  d as (
    select (created_at   at time zone 'Asia/Ulaanbaatar')::date as created_day,
           (delivered_at at time zone 'Asia/Ulaanbaatar')::date as delivered_day,
           (cancelled_at at time zone 'Asia/Ulaanbaatar')::date as cancelled_day
    from public.deliveries
  ),
  p as (
    select (recorded_at at time zone 'Asia/Ulaanbaatar')::date as day, method, amount
    from public.payment_records
    where voided_at is null
  )
  select
    days.day,
    (select count(*) from d where d.created_day = days.day)::integer,
    (select count(*) from d where d.delivered_day = days.day)::integer,
    (select count(*) from d where d.cancelled_day = days.day)::integer,
    (select coalesce(sum(p.amount), 0) from p where p.day = days.day and p.method = 'CASH'),
    (select coalesce(sum(p.amount), 0) from p where p.day = days.day and p.method = 'BANK_TRANSFER')
  from days
  order by days.day;
end;
$$;

revoke all on function public.get_dashboard_stats(timestamptz, timestamptz) from public, anon;
revoke all on function public.get_courier_stats(timestamptz, timestamptz)   from public, anon;
revoke all on function public.get_daily_report(date, date)                  from public, anon;
grant execute on function public.get_dashboard_stats(timestamptz, timestamptz) to authenticated;
grant execute on function public.get_courier_stats(timestamptz, timestamptz)   to authenticated;
grant execute on function public.get_daily_report(date, date)                  to authenticated;
