-- =============================================================
-- 0019 · Bank account per factory (brand) for the courier's SMS
--
-- * factories.bank_account: free text the admin types, e.g.
--   "Хаан банк 5000000000 Нэр".
-- * Couriers cannot read factories, so get_delivery_bank_accounts()
--   returns only the accounts of the brands in one delivery, and only
--   to an admin or the courier the delivery is assigned to.
-- =============================================================

alter table public.factories
  add column bank_account text
    check (bank_account is null or (btrim(bank_account) <> '' and char_length(bank_account) <= 300));

grant insert (bank_account), update (bank_account) on public.factories to authenticated;

create or replace function public.get_delivery_bank_accounts(p_delivery_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    (select private.is_admin())
    or exists (select 1 from public.deliveries
               where id = p_delivery_id and courier_id = (select auth.uid()))
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return coalesce((
    select array_agg(account order by first_at)
    from (
      select f.bank_account as account, min(i.created_at) as first_at
      from public.delivery_items i
      join public.factories f on f.id = i.factory_id
      where i.delivery_id = p_delivery_id and f.bank_account is not null
      group by f.bank_account
    ) a
  ), '{}');
end;
$$;

revoke all on function public.get_delivery_bank_accounts(uuid) from public, anon;
grant execute on function public.get_delivery_bank_accounts(uuid) to authenticated;
