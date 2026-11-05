-- =============================================================
-- 0004 · payment_records
-- One full payment per delivery (no partial payments in MVP).
-- Corrections are made by voiding, never by deleting.
-- =============================================================

create table public.payment_records (
  id           uuid primary key default gen_random_uuid(),
  delivery_id  uuid not null references public.deliveries (id),
  amount       numeric(12, 2) not null check (amount > 0), -- MNT
  method       public.payment_method not null,
  recorded_by  uuid not null references public.profiles (id),
  recorded_at  timestamptz not null default now(),
  receipt_path text,
  note         text,

  voided_at    timestamptz,
  voided_by    uuid references public.profiles (id),
  void_reason  text,

  constraint payment_records_void_chk check (
    (voided_at is null and voided_by is null and void_reason is null)
    or (voided_at is not null and voided_by is not null and void_reason is not null)
  )
);

-- At most one non-voided payment per delivery.
create unique index payment_records_one_active_idx
  on public.payment_records (delivery_id)
  where voided_at is null;

create index payment_records_recorded_by_idx on public.payment_records (recorded_by, recorded_at desc);
create index payment_records_recorded_at_idx on public.payment_records (recorded_at desc);
