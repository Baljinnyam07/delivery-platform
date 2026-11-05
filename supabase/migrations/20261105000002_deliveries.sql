-- =============================================================
-- 0002 · deliveries
-- =============================================================

create sequence public.delivery_code_seq;

create table public.deliveries (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique
                        default 'D-' || lpad(nextval('public.delivery_code_seq')::text, 6, '0'),

  customer_name       text not null check (btrim(customer_name) <> ''),
  customer_phone      text not null check (btrim(customer_phone) <> ''),
  address             text not null check (btrim(address) <> ''),
  address_note        text,
  latitude            double precision check (latitude between -90 and 90),
  longitude           double precision check (longitude between -180 and 180),
  package_description text,
  notes               text,
  amount_due          numeric(12, 2) not null default 0 check (amount_due >= 0), -- MNT

  status              public.delivery_status not null default 'UNASSIGNED',
  courier_id          uuid references public.profiles (id),

  -- Independent from delivery status (business rule 6).
  payment_status      public.payment_status not null default 'UNPAID',
  payment_method      public.payment_method,

  scheduled_date      date,
  assigned_at         timestamptz,
  started_at          timestamptz,
  delivered_at        timestamptz,
  cancelled_at        timestamptz,
  cancel_reason       text,

  created_by          uuid references public.profiles (id) default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- One delivery ↔ at most one courier, consistent with status.
  constraint deliveries_status_courier_chk check (
    (status = 'UNASSIGNED' and courier_id is null)
    or (status in ('ASSIGNED', 'IN_PROGRESS', 'DELIVERED') and courier_id is not null)
    or status = 'CANCELLED'
  ),
  constraint deliveries_cancel_reason_chk check (
    status <> 'CANCELLED' or cancel_reason is not null
  ),
  constraint deliveries_payment_method_chk check (
    (payment_status = 'PAID') = (payment_method is not null)
  ),
  constraint deliveries_coords_pair_chk check (
    (latitude is null) = (longitude is null)
  )
);

create index deliveries_status_created_idx on public.deliveries (status, created_at desc);
create index deliveries_courier_status_idx on public.deliveries (courier_id, status);
create index deliveries_payment_status_idx on public.deliveries (payment_status);
create index deliveries_scheduled_date_idx on public.deliveries (scheduled_date);

create trigger deliveries_set_updated_at
  before update on public.deliveries
  for each row execute function private.set_updated_at();

-- Amount cannot change once a payment is recorded (void the payment first).
create or replace function private.guard_paid_amount()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.payment_status = 'PAID' and new.amount_due is distinct from old.amount_due then
    raise exception 'AMOUNT_LOCKED';
  end if;
  return new;
end;
$$;

create trigger deliveries_guard_paid_amount
  before update of amount_due on public.deliveries
  for each row execute function private.guard_paid_amount();
