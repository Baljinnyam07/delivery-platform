-- =============================================================
-- 0001 · Enums, private schema, profiles
-- =============================================================

-- Internal helpers live in `private`, which is NOT exposed by the API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public;

-- -------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------
create type public.user_role as enum ('ADMIN', 'COURIER');

create type public.delivery_status as enum (
  'UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'
);

create type public.payment_method as enum ('CASH', 'BANK_TRANSFER');

create type public.payment_status as enum ('PAID', 'UNPAID');

create type public.assignment_start as enum ('ASSIGNED', 'CLAIMED', 'REASSIGNED');

create type public.assignment_end as enum (
  'REASSIGNED', 'UNASSIGNED', 'RETURNED', 'CANCELLED', 'COMPLETED'
);

-- -------------------------------------------------------------
-- Shared trigger: updated_at
-- -------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  role            public.user_role not null,
  full_name       text not null check (btrim(full_name) <> ''),
  phone           text,
  is_active       boolean not null default true,
  expo_push_token text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index profiles_role_active_idx on public.profiles (role, is_active);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- -------------------------------------------------------------
-- Profile is created automatically for every auth user whose
-- role is set in app_metadata (only the service role can set it).
-- Users without a role get no profile and therefore no access.
-- -------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_app_meta_data ->> 'role' in ('ADMIN', 'COURIER') then
    insert into public.profiles (id, role, full_name, phone)
    values (
      new.id,
      (new.raw_app_meta_data ->> 'role')::public.user_role,
      coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), new.email),
      nullif(btrim(new.raw_user_meta_data ->> 'phone'), '')
    );
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -------------------------------------------------------------
-- Role helpers (used by RLS policies and RPC functions)
-- -------------------------------------------------------------
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN' and is_active
  );
$$;

create or replace function private.is_active_courier()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'COURIER' and is_active
  );
$$;

-- Raise stable error codes; clients map them via @delivery/shared.
create or replace function private.assert_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or v_profile.role <> 'ADMIN' then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if not v_profile.is_active then
    raise exception 'USER_INACTIVE';
  end if;
  return v_profile.id;
end;
$$;

create or replace function private.assert_courier()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or v_profile.role <> 'COURIER' then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if not v_profile.is_active then
    raise exception 'USER_INACTIVE';
  end if;
  return v_profile.id;
end;
$$;

-- Target courier for assign / reassign must exist and be active.
create or replace function private.assert_target_courier(p_courier_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = p_courier_id;
  if not found or v_profile.role <> 'COURIER' then
    raise exception 'COURIER_NOT_FOUND';
  end if;
  if not v_profile.is_active then
    raise exception 'COURIER_INACTIVE';
  end if;
end;
$$;

create or replace function private.require_reason(p_reason text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'REASON_REQUIRED';
  end if;
  return btrim(p_reason);
end;
$$;

revoke all on all functions in schema private from public;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_active_courier() to authenticated;
