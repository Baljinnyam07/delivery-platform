-- =============================================================
-- 0018 · Expenses per brand (factory) for the report
--
-- * An expense belongs to one factory, or is shared (factory_id null).
-- * A shared expense is split equally between the active factories at
--   the moment it is recorded; the split is stored in
--   expense_allocations so later catalogue changes never rewrite history.
--   Shares are whole tögrög; the remainder goes to the oldest factory.
-- * Admin only. Expenses are never hard-deleted: deleting voids them
--   (voided_at / voided_by) and the report ignores voided rows.
-- * Writes only through SECURITY DEFINER functions.
-- =============================================================

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  spent_on     date not null,
  amount       numeric(12, 2) not null check (amount > 0 and amount = trunc(amount)), -- whole MNT
  description  text not null check (btrim(description) <> '' and char_length(description) <= 200),
  factory_id   uuid references public.factories (id), -- null = shared between brands
  created_by   uuid references public.profiles (id) default auth.uid(),
  created_at   timestamptz not null default now(),
  voided_at    timestamptz,
  voided_by    uuid references public.profiles (id),
  check ((voided_at is null) = (voided_by is null))
);

create index expenses_spent_on_idx on public.expenses (spent_on desc);

create table public.expense_allocations (
  expense_id  uuid not null references public.expenses (id),
  factory_id  uuid not null references public.factories (id),
  amount      numeric(12, 2) not null check (amount >= 0),
  primary key (expense_id, factory_id)
);

create index expense_allocations_factory_idx on public.expense_allocations (factory_id);

-- -------------------------------------------------------------
-- Privileges + RLS: admin reads, nobody writes directly
-- -------------------------------------------------------------
revoke all on public.expenses, public.expense_allocations from anon, authenticated;
grant select on public.expenses, public.expense_allocations to authenticated;

alter table public.expenses            enable row level security;
alter table public.expense_allocations enable row level security;

create policy expenses_select_admin on public.expenses
  for select to authenticated using ((select private.is_admin()));
create policy expense_allocations_select_admin on public.expense_allocations
  for select to authenticated using ((select private.is_admin()));

-- -------------------------------------------------------------
-- create_expense: insert + allocate in one transaction.
-- Idempotent on the client-generated id (double submit).
-- -------------------------------------------------------------
create or replace function public.create_expense(
  p_id          uuid,
  p_spent_on    date,
  p_amount      numeric,
  p_description text,
  p_factory_id  uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id         uuid := coalesce(p_id, gen_random_uuid());
  v_factories  uuid[];
  v_n          integer;
  v_share      numeric;
begin
  perform private.assert_admin();

  if exists (select 1 from public.expenses where id = v_id) then
    return v_id;
  end if;

  if p_spent_on is null or p_amount is null or p_amount <= 0 or p_amount <> trunc(p_amount)
     or p_description is null or btrim(p_description) = '' or char_length(btrim(p_description)) > 200 then
    raise exception 'EXPENSE_INVALID';
  end if;

  if p_factory_id is not null then
    if not exists (select 1 from public.factories where id = p_factory_id) then
      raise exception 'FACTORY_NOT_FOUND';
    end if;
    v_factories := array[p_factory_id];
  else
    select array_agg(id order by created_at, name) into v_factories
    from public.factories where is_active;
    if v_factories is null then
      raise exception 'FACTORY_NOT_FOUND';
    end if;
  end if;

  insert into public.expenses (id, spent_on, amount, description, factory_id)
  values (v_id, p_spent_on, p_amount, btrim(p_description), p_factory_id);

  v_n := array_length(v_factories, 1);
  v_share := floor(p_amount / v_n);
  insert into public.expense_allocations (expense_id, factory_id, amount)
  select v_id, f.id,
         v_share + case when f.ord = 1 then p_amount - v_share * v_n else 0 end
  from unnest(v_factories) with ordinality as f (id, ord);

  return v_id;
end;
$$;

-- -------------------------------------------------------------
-- void_expense: soft delete, keeps the row for the audit trail.
-- -------------------------------------------------------------
create or replace function public.void_expense(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();

  update public.expenses
     set voided_at = now(), voided_by = auth.uid()
   where id = p_id and voided_at is null;

  if not found then
    raise exception 'EXPENSE_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.create_expense(uuid, date, numeric, text, uuid) from public, anon;
revoke all on function public.void_expense(uuid) from public, anon;
grant execute on function public.create_expense(uuid, date, numeric, text, uuid) to authenticated;
grant execute on function public.void_expense(uuid) to authenticated;
