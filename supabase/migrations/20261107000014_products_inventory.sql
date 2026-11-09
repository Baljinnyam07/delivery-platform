-- =============================================================
-- 0014 · Factories, products, stock and delivery line items
--
-- * factories → products (fixed unit price + stock on hand)
-- * delivery_items snapshot product name / factory / price at order time
-- * Stock is reserved when a delivery is created and returned when it
--   is cancelled. Every change is logged in stock_movements.
-- * Stock and items change only through SECURITY DEFINER functions.
-- =============================================================

create type public.stock_movement_reason as enum ('RESTOCK', 'ADJUSTMENT', 'DELIVERY', 'CANCELLED');

-- -------------------------------------------------------------
-- Tables
-- -------------------------------------------------------------
create table public.factories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (btrim(name) <> ''),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.products (
  id                   uuid primary key default gen_random_uuid(),
  factory_id           uuid not null references public.factories (id),
  name                 text not null check (btrim(name) <> ''),
  unit                 text not null default 'ш' check (btrim(unit) <> ''),
  unit_price           numeric(12, 2) not null default 0 check (unit_price >= 0), -- MNT
  stock                integer not null default 0 check (stock >= 0),
  low_stock_threshold  integer not null default 5 check (low_stock_threshold >= 0),
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (factory_id, name)
);

create index products_factory_idx on public.products (factory_id);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

create table public.delivery_items (
  id            uuid primary key default gen_random_uuid(),
  delivery_id   uuid not null references public.deliveries (id) on delete cascade,
  product_id    uuid not null references public.products (id),
  factory_id    uuid not null references public.factories (id),
  product_name  text not null,
  unit          text not null,
  unit_price    numeric(12, 2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity > 0),
  line_total    numeric(14, 2) generated always as (unit_price * quantity) stored,
  created_at    timestamptz not null default now()
);

create index delivery_items_delivery_idx on public.delivery_items (delivery_id);
create index delivery_items_product_idx on public.delivery_items (product_id);
create index delivery_items_factory_idx on public.delivery_items (factory_id);

create table public.stock_movements (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products (id),
  quantity_change  integer not null check (quantity_change <> 0),
  stock_after      integer not null check (stock_after >= 0),
  reason           public.stock_movement_reason not null,
  delivery_id      uuid references public.deliveries (id) on delete set null,
  note             text,
  created_by       uuid references public.profiles (id) default auth.uid(),
  created_at       timestamptz not null default now()
);

create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);

-- -------------------------------------------------------------
-- Privileges + RLS
-- -------------------------------------------------------------
revoke all on public.factories, public.products, public.delivery_items, public.stock_movements
  from anon, authenticated;

grant select on public.factories, public.products, public.delivery_items, public.stock_movements
  to authenticated;

-- Admin manages catalogue fields directly; stock only via adjust_stock().
grant insert (id, name, is_active) on public.factories to authenticated;
grant update (name, is_active) on public.factories to authenticated;
grant insert (id, factory_id, name, unit, unit_price, low_stock_threshold, is_active)
  on public.products to authenticated;
grant update (name, unit, unit_price, low_stock_threshold, is_active)
  on public.products to authenticated;

alter table public.factories       enable row level security;
alter table public.products        enable row level security;
alter table public.delivery_items  enable row level security;
alter table public.stock_movements enable row level security;

create policy factories_select_admin on public.factories
  for select to authenticated using ((select private.is_admin()));
create policy factories_insert_admin on public.factories
  for insert to authenticated with check ((select private.is_admin()));
create policy factories_update_admin on public.factories
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy products_select_admin on public.products
  for select to authenticated using ((select private.is_admin()));
create policy products_insert_admin on public.products
  for insert to authenticated with check ((select private.is_admin()));
create policy products_update_admin on public.products
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Couriers see the line items of deliveries they can see.
create policy delivery_items_select on public.delivery_items
  for select to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.is_active_courier())
      and exists (
        select 1 from public.deliveries d
        where d.id = delivery_items.delivery_id and d.courier_id = (select auth.uid())
      )
    )
  );

create policy stock_movements_select_admin on public.stock_movements
  for select to authenticated using ((select private.is_admin()));

-- -------------------------------------------------------------
-- adjust_stock: restock or manual correction (admin)
-- -------------------------------------------------------------
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_change     integer,
  p_reason     public.stock_movement_reason default 'RESTOCK',
  p_note       text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_stock   integer;
begin
  perform private.assert_admin();

  if p_reason not in ('RESTOCK', 'ADJUSTMENT') then
    raise exception 'INVALID_STOCK_CHANGE';
  end if;
  if p_change is null or p_change = 0 or (p_reason = 'RESTOCK' and p_change < 0) then
    raise exception 'INVALID_STOCK_CHANGE';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  v_stock := v_product.stock + p_change;
  if v_stock < 0 then
    raise exception 'NOT_ENOUGH_STOCK';
  end if;

  update public.products set stock = v_stock where id = p_product_id;
  insert into public.stock_movements (product_id, quantity_change, stock_after, reason, note)
  values (p_product_id, p_change, v_stock, p_reason, nullif(btrim(p_note), ''));

  return v_stock;
end;
$$;

-- -------------------------------------------------------------
-- create_delivery: delivery + line items + stock reservation
-- (+ optional prepaid payment) in one transaction (admin)
--
-- p_delivery: customer_name, customer_phone, address, address_note,
--             latitude, longitude, package_description, notes,
--             scheduled_date, id (optional, for idempotent submits)
-- p_items:    [{ "product_id": uuid, "quantity": int }, ...]
-- p_amount:   null → sum of line totals (or 0 without items)
-- p_payment_method: set when the customer has already paid
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
  v_id       uuid := coalesce(nullif(p_delivery ->> 'id', '')::uuid, gen_random_uuid());
  v_item     jsonb;
  v_qty      integer;
  v_product  public.products;
  v_total    numeric := 0;
  v_summary  text;
  v_amount   numeric;
begin
  perform private.assert_admin();

  -- Idempotent: a double-submitted form returns the existing delivery.
  if exists (select 1 from public.deliveries where id = v_id) then
    return v_id;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'ITEMS_INVALID';
  end if;
  if p_amount is not null and p_amount < 0 then
    raise exception 'ITEMS_INVALID';
  end if;

  insert into public.deliveries (
    id, customer_name, customer_phone, address, address_note,
    latitude, longitude, package_description, notes, amount_due, scheduled_date
  ) values (
    v_id,
    btrim(p_delivery ->> 'customer_name'),
    btrim(p_delivery ->> 'customer_phone'),
    btrim(p_delivery ->> 'address'),
    nullif(btrim(p_delivery ->> 'address_note'), ''),
    nullif(p_delivery ->> 'latitude', '')::double precision,
    nullif(p_delivery ->> 'longitude', '')::double precision,
    nullif(btrim(p_delivery ->> 'package_description'), ''),
    nullif(btrim(p_delivery ->> 'notes'), ''),
    0,
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

  v_amount := coalesce(p_amount, v_total);

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

-- -------------------------------------------------------------
-- Cancelled delivery → reserved stock goes back to the shelf
-- -------------------------------------------------------------
create or replace function private.restore_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item  record;
  v_stock integer;
begin
  if new.status = 'CANCELLED' and old.status is distinct from 'CANCELLED' then
    for v_item in
      select product_id, sum(quantity)::integer as qty
      from public.delivery_items
      where delivery_id = new.id
      group by product_id
    loop
      update public.products
         set stock = stock + v_item.qty
       where id = v_item.product_id
      returning stock into v_stock;

      insert into public.stock_movements (product_id, quantity_change, stock_after, reason, delivery_id)
      values (v_item.product_id, v_item.qty, v_stock, 'CANCELLED', new.id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger deliveries_restore_stock_on_cancel
  after update of status on public.deliveries
  for each row execute function private.restore_stock_on_cancel();

-- -------------------------------------------------------------
-- get_factory_report: per factory / product, for a date range
--   delivered_*  → deliveries delivered in the range (UB time)
--   in_transit   → currently open deliveries (not range-bound)
-- -------------------------------------------------------------
create or replace function public.get_factory_report(p_from date, p_to date)
returns table (
  factory_id        uuid,
  factory_name      text,
  product_id        uuid,
  product_name      text,
  unit              text,
  unit_price        numeric,
  delivered_qty     integer,
  delivered_amount  numeric,
  in_transit_qty    integer,
  cancelled_qty     integer,
  stock             integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'INVALID_RANGE';
  end if;

  return query
  with lines as (
    select i.product_id, i.quantity, i.line_total, d.status,
           (d.delivered_at at time zone 'Asia/Ulaanbaatar')::date as delivered_day,
           (d.cancelled_at at time zone 'Asia/Ulaanbaatar')::date as cancelled_day
    from public.delivery_items i
    join public.deliveries d on d.id = i.delivery_id
  )
  select
    f.id, f.name, p.id, p.name, p.unit, p.unit_price,
    coalesce((select sum(l.quantity) from lines l
              where l.product_id = p.id and l.status = 'DELIVERED'
                and l.delivered_day between p_from and p_to), 0)::integer,
    coalesce((select sum(l.line_total) from lines l
              where l.product_id = p.id and l.status = 'DELIVERED'
                and l.delivered_day between p_from and p_to), 0)::numeric,
    coalesce((select sum(l.quantity) from lines l
              where l.product_id = p.id and l.status in ('UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS')), 0)::integer,
    coalesce((select sum(l.quantity) from lines l
              where l.product_id = p.id and l.status = 'CANCELLED'
                and l.cancelled_day between p_from and p_to), 0)::integer,
    p.stock
  from public.factories f
  join public.products p on p.factory_id = f.id
  order by f.name, p.name;
end;
$$;

revoke all on function public.adjust_stock(uuid, integer, public.stock_movement_reason, text) from public, anon;
revoke all on function public.create_delivery(jsonb, jsonb, numeric, public.payment_method) from public, anon;
revoke all on function public.get_factory_report(date, date) from public, anon;
grant execute on function public.adjust_stock(uuid, integer, public.stock_movement_reason, text) to authenticated;
grant execute on function public.create_delivery(jsonb, jsonb, numeric, public.payment_method) to authenticated;
grant execute on function public.get_factory_report(date, date) to authenticated;
revoke all on function private.restore_stock_on_cancel() from public, anon, authenticated;
