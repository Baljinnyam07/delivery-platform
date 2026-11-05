-- =============================================================
-- 0012 · Create profile when the role arrives via UPDATE
--
-- GoTrue's admin createUser inserts auth.users first and sets custom
-- app_metadata (our `role`) in a follow-up UPDATE, so the INSERT-only
-- trigger from 0001 never saw the role. Fire on both, and only ever
-- CREATE a missing profile — an existing profile's role is never changed.
-- =============================================================

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
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger on_auth_user_role_set
  after update of raw_app_meta_data on auth.users
  for each row
  when (new.raw_app_meta_data ->> 'role' is distinct from old.raw_app_meta_data ->> 'role')
  execute function private.handle_new_user();

-- Backfill users created through the Auth admin API before this fix.
insert into public.profiles (id, role, full_name, phone)
select u.id,
       (u.raw_app_meta_data ->> 'role')::public.user_role,
       coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), u.email),
       nullif(btrim(u.raw_user_meta_data ->> 'phone'), '')
from auth.users u
where u.raw_app_meta_data ->> 'role' in ('ADMIN', 'COURIER')
  and not exists (select 1 from public.profiles p where p.id = u.id);
