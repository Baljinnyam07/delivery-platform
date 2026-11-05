-- =============================================================
-- 0006 · Privileges + Row Level Security
--
-- Two layers:
--   1. Table/column GRANTs decide WHAT can be touched at all.
--      status / courier_id / payment_status are not writable by
--      clients — only SECURITY DEFINER RPC functions change them.
--   2. RLS policies decide WHICH ROWS each role sees.
-- No table grants DELETE to clients.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Privileges (Supabase grants ALL by default — reset first)
-- -------------------------------------------------------------
revoke all on public.profiles                from anon, authenticated;
revoke all on public.deliveries              from anon, authenticated;
revoke all on public.delivery_assignments    from anon, authenticated;
revoke all on public.delivery_status_history from anon, authenticated;
revoke all on public.payment_records         from anon, authenticated;
revoke all on public.notifications           from anon, authenticated;
revoke all on sequence public.delivery_code_seq from anon, authenticated;

grant select on public.profiles, public.deliveries, public.delivery_assignments,
                public.delivery_status_history, public.payment_records,
                public.notifications
  to authenticated;

-- profiles: only harmless self-service columns (role / is_active never).
grant update (full_name, phone, expo_push_token) on public.profiles to authenticated;

-- deliveries: admin creates and edits descriptive fields only.
-- `id` may be client-generated so a double-submitted create is idempotent.
grant insert (id, customer_name, customer_phone, address, address_note,
              latitude, longitude, package_description, notes,
              amount_due, scheduled_date)
  on public.deliveries to authenticated;
grant update (customer_name, customer_phone, address, address_note,
              latitude, longitude, package_description, notes,
              amount_due, scheduled_date)
  on public.deliveries to authenticated;
grant usage on sequence public.delivery_code_seq to authenticated;

-- notifications: recipient can only mark as read.
grant update (read_at) on public.notifications to authenticated;

-- -------------------------------------------------------------
-- 2. RLS
-- -------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.deliveries              enable row level security;
alter table public.delivery_assignments    enable row level security;
alter table public.delivery_status_history enable row level security;
alter table public.payment_records         enable row level security;
alter table public.notifications           enable row level security;

-- profiles ----------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

-- deliveries --------------------------------------------------
-- Couriers see only deliveries currently/previously theirs.
-- Unassigned deliveries reach couriers only via
-- list_available_deliveries() (customer phone hidden, decision D3).
create policy deliveries_select_admin on public.deliveries
  for select to authenticated
  using ((select private.is_admin()));

create policy deliveries_select_courier on public.deliveries
  for select to authenticated
  using (courier_id = (select auth.uid()) and (select private.is_active_courier()));

create policy deliveries_insert_admin on public.deliveries
  for insert to authenticated
  with check ((select private.is_admin()));

create policy deliveries_update_admin on public.deliveries
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- delivery_assignments ----------------------------------------
create policy assignments_select on public.delivery_assignments
  for select to authenticated
  using (
    (select private.is_admin())
    or (courier_id = (select auth.uid()) and (select private.is_active_courier()))
  );

-- delivery_status_history -------------------------------------
create policy status_history_select on public.delivery_status_history
  for select to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.is_active_courier())
      and exists (
        select 1 from public.deliveries d
        where d.id = delivery_status_history.delivery_id
          and d.courier_id = (select auth.uid())
      )
    )
  );

-- payment_records ---------------------------------------------
create policy payment_records_select on public.payment_records
  for select to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.is_active_courier())
      and exists (
        select 1 from public.deliveries d
        where d.id = payment_records.delivery_id
          and d.courier_id = (select auth.uid())
      )
    )
  );

-- notifications -----------------------------------------------
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));
