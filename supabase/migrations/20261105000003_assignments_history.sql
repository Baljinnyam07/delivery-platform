-- =============================================================
-- 0003 · delivery_assignments, delivery_status_history
-- =============================================================

-- -------------------------------------------------------------
-- delivery_assignments: who owned a delivery, how and why it ended.
-- Rows are only ever closed, never edited otherwise or deleted.
-- -------------------------------------------------------------
create table public.delivery_assignments (
  id                  uuid primary key default gen_random_uuid(),
  delivery_id         uuid not null references public.deliveries (id),
  courier_id          uuid not null references public.profiles (id),

  start_action        public.assignment_start not null,
  previous_courier_id uuid references public.profiles (id),
  start_note          text,
  started_by          uuid references public.profiles (id),
  started_at          timestamptz not null default now(),

  ended_at            timestamptz,
  end_reason          public.assignment_end,
  end_note            text,
  ended_by            uuid references public.profiles (id),

  constraint assignments_end_consistency_chk check (
    (ended_at is null) = (end_reason is null)
  ),
  constraint assignments_reassign_note_chk check (
    start_action <> 'REASSIGNED' or (start_note is not null and previous_courier_id is not null)
  ),
  constraint assignments_end_note_chk check (
    end_reason is null
    or end_reason not in ('UNASSIGNED', 'RETURNED', 'CANCELLED')
    or end_note is not null
  )
);

-- Business rule 1: at most one active courier per delivery (DB-level backstop).
create unique index delivery_assignments_one_active_idx
  on public.delivery_assignments (delivery_id)
  where ended_at is null;

create index delivery_assignments_delivery_idx on public.delivery_assignments (delivery_id, started_at);
create index delivery_assignments_courier_idx on public.delivery_assignments (courier_id, started_at desc);

-- -------------------------------------------------------------
-- delivery_status_history: written ONLY by trigger (business rule 3).
-- -------------------------------------------------------------
create table public.delivery_status_history (
  id          bigint generated always as identity primary key,
  delivery_id uuid not null references public.deliveries (id),
  from_status public.delivery_status,
  to_status   public.delivery_status not null,
  changed_by  uuid references public.profiles (id),
  note        text,
  created_at  timestamptz not null default now()
);

create index delivery_status_history_delivery_idx
  on public.delivery_status_history (delivery_id, created_at);

-- RPCs attach a reason to the next status change via a transaction-local setting.
create or replace function private.set_status_note(p_note text)
returns void
language sql
set search_path = ''
as $$
  select set_config('app.status_note', coalesce(p_note, ''), true);
$$;

create or replace function private.log_delivery_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.delivery_status_history (delivery_id, from_status, to_status, changed_by, note)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.status end,
      new.status,
      auth.uid(),
      nullif(current_setting('app.status_note', true), '')
    );
    perform private.set_status_note(null);
  end if;
  return null;
end;
$$;

create trigger deliveries_log_status
  after insert or update of status on public.deliveries
  for each row execute function private.log_delivery_status();
