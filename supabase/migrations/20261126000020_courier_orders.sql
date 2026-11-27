-- =============================================================
-- 0020 · Couriers create their own orders
--
-- * create_courier_order(): an active courier creates a delivery (same
--   rules as the admin: items, stock, brand code, fee) and it is assigned
--   to that courier at once (assignment start_action CLAIMED).
--   deliveries.created_by (default auth.uid()) records who created it.
-- * list_order_products(): active products of active factories for the
--   courier's product picker (couriers have no direct access to products).
-- * No "delivery available" push for a courier's own order: it is never
--   up for grabs.
-- * create_delivery() keeps its signature; its body moves to
--   private.create_delivery_core() so both entry points share one code path.
-- =============================================================

-- -------------------------------------------------------------
-- Shared core (body of 0015 create_delivery without the role check)
-- -------------------------------------------------------------
create or replace function private.create_delivery_core(
  p_delivery        jsonb,
  p_items           jsonb,
  p_amount          numeric,
  p_payment_method  public.payment_method
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

revoke all on function private.create_delivery_core(jsonb, jsonb, numeric, public.payment_method) from public, anon, authenticated;

-- -------------------------------------------------------------
-- Admin entry point (unchanged behaviour)
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
begin
  perform private.assert_admin();
  return private.create_delivery_core(p_delivery, p_items, p_amount, p_payment_method);
end;
$$;

-- -------------------------------------------------------------
-- Courier: create an order and take it
--   p_amount  goods amount when there are no items (ignored with items)
-- -------------------------------------------------------------
create or replace function public.create_courier_order(
  p_delivery  jsonb,
  p_items     jsonb default '[]'::jsonb,
  p_amount    numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_courier();
  v_id  uuid := nullif(p_delivery ->> 'id', '')::uuid;
  v_has_items boolean := jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 0;
begin
  -- Replayed submit: only the creator gets the id back; never touch
  -- someone else's delivery through a guessed id.
  if v_id is not null and exists (select 1 from public.deliveries where id = v_id) then
    if exists (select 1 from public.deliveries where id = v_id and created_by = v_uid) then
      return v_id;
    end if;
    raise exception 'NOT_AUTHORIZED';
  end if;

  -- Couriers do not set dates or record prepayments here.
  v_id := private.create_delivery_core(
    p_delivery - 'scheduled_date',
    p_items,
    case when v_has_items then null else p_amount end,
    null
  );

  perform private.set_status_note(null);

  update public.deliveries
     set status = 'ASSIGNED', courier_id = v_uid, assigned_at = now()
   where id = v_id
     and status = 'UNASSIGNED';

  insert into public.delivery_assignments (delivery_id, courier_id, start_action, started_by)
  values (v_id, v_uid, 'CLAIMED', v_uid);

  return v_id;
end;
$$;

revoke all on function public.create_courier_order(jsonb, jsonb, numeric) from public, anon;
grant execute on function public.create_courier_order(jsonb, jsonb, numeric) to authenticated;

-- -------------------------------------------------------------
-- Courier: products for the order form
-- -------------------------------------------------------------
create or replace function public.list_order_products()
returns table (
  id            uuid,
  name          text,
  unit          text,
  unit_price    numeric,
  stock         integer,
  factory_id    uuid,
  factory_name  text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.is_active_courier() or private.is_admin()) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  return query
    select p.id, p.name, p.unit, p.unit_price, p.stock, p.factory_id, f.name
    from public.products p
    join public.factories f on f.id = p.factory_id
    where p.is_active and f.is_active
    order by f.name, p.name;
end;
$$;

revoke all on function public.list_order_products() from public, anon;
grant execute on function public.list_order_products() to authenticated;

-- -------------------------------------------------------------
-- No "available" push for a courier's own order
-- -------------------------------------------------------------
create or replace function private.notify_delivery_available()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_courier uuid := case when tg_op = 'UPDATE' then old.courier_id end;
begin
  if new.status <> 'UNASSIGNED' then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.status = 'UNASSIGNED' then
    return null;
  end if;
  -- Created by a courier → assigned to them in the same transaction.
  if tg_op = 'INSERT' and private.is_active_courier() then
    return null;
  end if;

  insert into public.notifications (recipient_id, type, title, body)
  select p.id,
         'DELIVERY_AVAILABLE',
         'Шинэ хүргэлт: ' || new.code,
         left(new.address, 140)
  from public.profiles p
  where p.role = 'COURIER'
    and p.is_active
    and p.id is distinct from v_previous_courier;

  return null;
end;
$$;
