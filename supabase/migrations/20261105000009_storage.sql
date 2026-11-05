-- =============================================================
-- 0009 · Storage: payment receipts (private bucket)
-- Path convention: {delivery_id}/{uuid}.jpg
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function private.can_access_delivery_files(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
      or (
        private.is_active_courier()
        and exists (
          select 1 from public.deliveries d
          where d.id::text = (storage.foldername(p_object_name))[1]
            and d.courier_id = auth.uid()
            and d.status in ('ASSIGNED', 'IN_PROGRESS', 'DELIVERED')
        )
      );
$$;

grant execute on function private.can_access_delivery_files(text) to authenticated;

create policy payment_receipts_select on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-receipts' and private.can_access_delivery_files(name));

create policy payment_receipts_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-receipts' and private.can_access_delivery_files(name));
