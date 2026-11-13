-- =============================================================
-- 0017 · Edit the products of an existing delivery (admin)
--
-- update_delivery_items replaces the delivery's line items in one
-- transaction and keeps stock exact:
--   * removed / reduced lines → stock returned   (reason CANCELLED)
--   * added / increased lines → stock reserved   (reason DELIVERY)
-- Every change is logged in stock_movements with a note.
-- Unchanged lines keep their price snapshot; new lines use today's price.
-- Not allowed once DELIVERED / CANCELLED, or while a payment is recorded
-- (void it first). The order code never changes.
--
--   p_items         [{ "product_id": uuid, "quantity": int }, ...]
--   p_amount        goods amount; null → sum of line totals
--   p_delivery_fee  null → keep the current fee
--   amount_due      = goods + fee
-- =============================================================

create or replace function public.update_delivery_items(
  p_delivery_id   uuid,
  p_items         jsonb,
  p_amount        numeric default null,
  p_delivery_fee  numeric default null
)
returns public.deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delivery  public.deliveries;
  v_fee       numeric;
  v_item      jsonb;
  v_qty       integer;
  v_old       integer;
  v_delta     integer;
  v_product   public.products;
  v_line      record;
  v_stock     integer;
  v_total     numeric;
  v_summary   text;
  v_had_items boolean;
  v_note     constant text := 'Хүргэлтийн бараа засварласан';
begin
  perform private.assert_admin();

  select * into v_delivery from public.deliveries where id = p_delivery_id for update;
  if not found then
    raise exception 'DELIVERY_NOT_FOUND';
  end if;
  if v_delivery.status in ('DELIVERED', 'CANCELLED') then
    raise exception 'INVALID_TRANSITION';
  end if;
  if v_delivery.payment_status = 'PAID' then
    raise exception 'AMOUNT_LOCKED';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or (select count(*) from jsonb_array_elements(p_items))
        <> (select count(distinct e ->> 'product_id') from jsonb_array_elements(p_items) e)
     or (p_amount is not null and p_amount < 0)
     or (p_delivery_fee is not null and p_delivery_fee < 0) then
    raise exception 'ITEMS_INVALID';
  end if;
  v_fee := coalesce(p_delivery_fee, v_delivery.delivery_fee);
  v_had_items := exists (select 1 from public.delivery_items where delivery_id = p_delivery_id);

  -- 1. Lines no longer wanted: give their stock back.
  for v_line in
    select i.product_id, sum(i.quantity)::integer as qty
    from public.delivery_items i
    where i.delivery_id = p_delivery_id
      and i.product_id not in (select (e ->> 'product_id')::uuid from jsonb_array_elements(p_items) e)
    group by i.product_id
  loop
    update public.products set stock = stock + v_line.qty where id = v_line.product_id returning stock into v_stock;
    insert into public.stock_movements (product_id, quantity_change, stock_after, reason, delivery_id, note)
    values (v_line.product_id, v_line.qty, v_stock, 'CANCELLED', p_delivery_id, v_note);
    delete from public.delivery_items where delivery_id = p_delivery_id and product_id = v_line.product_id;
  end loop;

  -- 2. New and changed lines.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'ITEMS_INVALID';
    end if;

    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid for update;
    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    select sum(quantity)::integer into v_old
    from public.delivery_items
    where delivery_id = p_delivery_id and product_id = v_product.id;

    if v_old is null then
      if not v_product.is_active then
        raise exception 'PRODUCT_NOT_FOUND';
      end if;
      insert into public.delivery_items (delivery_id, product_id, factory_id, product_name, unit, unit_price, quantity)
      values (p_delivery_id, v_product.id, v_product.factory_id, v_product.name, v_product.unit, v_product.unit_price, v_qty);
      v_delta := v_qty;
    else
      v_delta := v_qty - v_old;
      if v_delta <> 0 then
        -- Collapse to one line (keeps the oldest price snapshot).
        delete from public.delivery_items
         where delivery_id = p_delivery_id and product_id = v_product.id
           and id <> (select id from public.delivery_items
                      where delivery_id = p_delivery_id and product_id = v_product.id
                      order by created_at limit 1);
        update public.delivery_items set quantity = v_qty
         where delivery_id = p_delivery_id and product_id = v_product.id;
      end if;
    end if;

    if v_delta > 0 then
      if v_product.stock < v_delta then
        raise exception 'NOT_ENOUGH_STOCK';
      end if;
      update public.products set stock = stock - v_delta where id = v_product.id returning stock into v_stock;
      insert into public.stock_movements (product_id, quantity_change, stock_after, reason, delivery_id, note)
      values (v_product.id, -v_delta, v_stock, 'DELIVERY', p_delivery_id, v_note);
    elsif v_delta < 0 then
      update public.products set stock = stock - v_delta where id = v_product.id returning stock into v_stock;
      insert into public.stock_movements (product_id, quantity_change, stock_after, reason, delivery_id, note)
      values (v_product.id, -v_delta, v_stock, 'CANCELLED', p_delivery_id, v_note);
    end if;
  end loop;

  -- 3. Totals and summary.
  select coalesce(sum(line_total), 0),
         string_agg(product_name || ' ×' || quantity, ', ' order by created_at, product_name)
    into v_total, v_summary
  from public.delivery_items
  where delivery_id = p_delivery_id;

  update public.deliveries
     set amount_due = coalesce(p_amount, v_total) + v_fee,
         delivery_fee = v_fee,
         -- Item summary; cleared when the last item is removed.
         package_description = case
           when v_summary is not null then v_summary
           when v_had_items then null
           else package_description
         end
   where id = p_delivery_id
  returning * into v_delivery;

  return v_delivery;
end;
$$;

revoke all on function public.update_delivery_items(uuid, jsonb, numeric, numeric) from public, anon;
grant execute on function public.update_delivery_items(uuid, jsonb, numeric, numeric) to authenticated;
