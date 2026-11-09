-- =============================================================
-- 0015 · Brand-based order codes and delivery fee
--
-- * Order code = brand letter + YYMMDD (Ulaanbaatar) + "-" + daily count
--   per letter, e.g. N261109-007. Letters come from factories.code_letter;
--   M = several brands in one delivery, D = no products / brand without letter.
--   Existing D-000123 codes stay as they are.
-- * deliveries.delivery_fee: part of amount_due (total = goods + fee).
-- =============================================================

-- -------------------------------------------------------------
-- Brand letter per factory
-- -------------------------------------------------------------
alter table public.factories
  add column code_letter text
    check (code_letter ~ '^[A-Z]$' and code_letter not in ('D', 'M'));

create unique index factories_code_letter_key
  on public.factories (code_letter) where code_letter is not null;

update public.factories set code_letter = 'N'
 where code_letter is null and (name ilike 'neko%' or name ilike 'неко%');
update public.factories set code_letter = 'F'
 where code_letter is null and (name ilike 'finice%' or name ilike 'финис%');

grant insert (code_letter), update (code_letter) on public.factories to authenticated;

-- -------------------------------------------------------------
-- Daily counters + code generator
-- -------------------------------------------------------------
create table private.delivery_code_counters (
  letter      text not null,
  day         date not null,
  last_value  integer not null,
  primary key (letter, day)
);

create or replace function private.next_delivery_code(p_letter text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Ulaanbaatar')::date;
  v_n   integer;
begin
  -- Row lock on (letter, day) serialises concurrent creates; a rolled-back
  -- create also rolls back its number, so codes have no gaps.
  insert into private.delivery_code_counters as c (letter, day, last_value)
  values (p_letter, v_day, 1)
  on conflict (letter, day) do update set last_value = c.last_value + 1
  returning last_value into v_n;

  return p_letter || to_char(v_day, 'YYMMDD') || '-'
      || case when v_n < 1000 then lpad(v_n::text, 3, '0') else v_n::text end;
end;
$$;

revoke all on function private.next_delivery_code(text) from public, anon;
grant execute on function private.next_delivery_code(text) to authenticated; -- column default below

alter table public.deliveries
  alter column code set default private.next_delivery_code('D');

-- -------------------------------------------------------------
-- Delivery fee
-- -------------------------------------------------------------
alter table public.deliveries
  add column delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  add constraint deliveries_fee_within_amount check (delivery_fee <= amount_due);

grant insert (delivery_fee), update (delivery_fee) on public.deliveries to authenticated;

-- Amount and fee are both locked once a payment is recorded.
create or replace function private.guard_paid_amount()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.payment_status = 'PAID'
     and (new.amount_due is distinct from old.amount_due
          or new.delivery_fee is distinct from old.delivery_fee) then
    raise exception 'AMOUNT_LOCKED';
  end if;
  return new;
end;
$$;

drop trigger deliveries_guard_paid_amount on public.deliveries;
create trigger deliveries_guard_paid_amount
  before update of amount_due, delivery_fee on public.deliveries
  for each row execute function private.guard_paid_amount();

-- -------------------------------------------------------------
-- create_delivery: brand code + fee
--   p_amount       goods amount; null → sum of line totals (0 without items)
--   delivery_fee   read from p_delivery; amount_due = goods + fee
-- -------------------------------------------------------------
create or replace function public.create_delivery(
  p_delivery        jsonb,
  p_items           jsonb default '[]'::jsonb,
  p_amount          numeric default null,
  p_payment_method  public.payment_method default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id        uuid := coalesce(nullif(p_delivery ->> 'id', '')::uuid, gen_random_uuid());
  v_fee       numeric := coalesce(nullif(p_delivery ->> 'delivery_fee', '')::numeric, 0);
  v_item      jsonb;
  v_qty       integer;
  v_product   public.products;
  v_total     numeric := 0;
  v_summary   text;
  v_amount    numeric;
  v_brands    integer;
  v_letter    text;
begin
  perform private.assert_admin();

  -- Idempotent: a double-submitted form returns the existing delivery.
  if exists (select 1 from public.deliveries where id = v_id) then
    return v_id;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'ITEMS_INVALID';
  end if;
  if (p_amount is not null and p_amount < 0) or v_fee < 0 then
    raise exception 'ITEMS_INVALID';
  end if;

  -- Brand letter from the products' factories.
  select count(distinct p.factory_id), min(f.code_letter)
    into v_brands, v_letter
  from jsonb_array_elements(p_items) e
  join public.products p on p.id = (e ->> 'product_id')::uuid
  join public.factories f on f.id = p.factory_id;

  v_letter := case when v_brands = 0 then 'D' when v_brands > 1 then 'M' else coalesce(v_letter, 'D') end;

  insert into public.deliveries (
    id, code, customer_name, customer_phone, address, address_note,
    latitude, longitude, package_description, notes, amount_due, delivery_fee, scheduled_date
  ) values (
    v_id,
    private.next_delivery_code(v_letter),
    btrim(p_delivery ->> 'customer_name'),
    btrim(p_delivery ->> 'customer_phone'),
    btrim(p_delivery ->> 'address'),
    nullif(btrim(p_delivery ->> 'address_note'), ''),
    nullif(p_delivery ->> 'latitude', '')::double precision,
    nullif(p_delivery ->> 'longitude', '')::double precision,
    nullif(btrim(p_delivery ->> 'package_description'), ''),
    nullif(btrim(p_delivery ->> 'notes'), ''),
    v_fee,
    v_fee,
    nullif(p_delivery ->> 'scheduled_date', '')::date
  );

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'ITEMS_INVALID';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
    for update;
    if not found or not v_product.is_active then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;
    if v_product.stock < v_qty then
      raise exception 'NOT_ENOUGH_STOCK';
    end if;

    insert into public.delivery_items (delivery_id, product_id, factory_id, product_name, unit, unit_price, quantity)
    values (v_id, v_product.id, v_product.factory_id, v_product.name, v_product.unit, v_product.unit_price, v_qty);

    update public.products set stock = stock - v_qty where id = v_product.id;
    insert into public.stock_movements (product_id, quantity_change, stock_after, reason, delivery_id)
    values (v_product.id, -v_qty, v_product.stock - v_qty, 'DELIVERY', v_id);

    v_total := v_total + v_product.unit_price * v_qty;
  end loop;

  select string_agg(i.product_name || ' ×' || i.quantity, ', ' order by i.created_at, i.product_name)
    into v_summary
  from public.delivery_items i
  where i.delivery_id = v_id;

  v_amount := coalesce(p_amount, v_total) + v_fee;

  update public.deliveries
     set amount_due = v_amount,
         package_description = coalesce(v_summary, package_description)
   where id = v_id;

  if p_payment_method is not null then
    perform public.record_payment(v_id, p_payment_method, v_amount, null, 'Урьдчилж төлсөн');
  end if;

  return v_id;
end;
$$;
