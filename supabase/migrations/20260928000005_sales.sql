-- Sales. Each sale item stores a snapshot of prices, fees, costs, profit and
-- product names, so later changes to products or costs never alter history.
--
--   fees       = gross - received
--   total_cost = unit_cost × quantity
--   profit     = received - total_cost          (may be negative: a loss)
--   margin     = profit / received  (derived, not stored)

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  channel_id uuid not null references public.sales_channels (id) on delete restrict,
  gross_amount numeric(12,2) not null default 0 check (gross_amount >= 0),
  received_amount numeric(12,2) not null default 0 check (received_amount >= 0),
  fees numeric(12,2) not null default 0 check (fees >= 0),
  total_cost numeric(12,2) not null default 0 check (total_cost >= 0),
  profit numeric(12,2) not null default 0,
  notes text,
  source text not null default 'app' check (source in ('app', 'import')),
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (received_amount <= gross_amount),
  check (fees = gross_amount - received_amount),
  check (profit = received_amount - total_cost)
);
create index sales_date_idx on public.sales (sale_date) where deleted_at is null;
create index sales_channel_idx on public.sales (channel_id);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete restrict,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  received_amount numeric(12,2) not null check (received_amount >= 0),
  fees numeric(12,2) not null check (fees >= 0),
  unit_cost numeric(14,6) not null check (unit_cost >= 0),
  total_cost numeric(12,2) not null check (total_cost >= 0),
  profit numeric(12,2) not null,
  is_customized boolean not null default false,
  customization_notes text,
  -- Snapshots
  product_name text not null,
  sku text not null,
  variant_label text,
  -- Set when the sale is edited: old lines stay for the stock history.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (received_amount <= gross_amount),
  check (fees = gross_amount - received_amount),
  check (profit = received_amount - total_cost)
);
create index sale_items_sale_idx on public.sale_items (sale_id);
create index sale_items_variant_idx on public.sale_items (variant_id);

alter table public.stock_movements
  add constraint stock_movements_sale_item_fk
  foreign key (sale_item_id) references public.sale_items (id) on delete restrict;

create trigger set_updated_at before update on public.sales
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.sale_items
  for each row execute function private.set_updated_at();

-- "Azul / Pequeno" — null for a product's default variant without values.
create or replace function private.variant_label(p_variant_id uuid)
returns text
language sql
stable
as $$
  select string_agg(vv.value, ' / ' order by vt.sort_order, vt.name)
  from public.product_variant_values pvv
  join public.variation_values vv on vv.id = pvv.variation_value_id
  join public.variation_types vt on vt.id = pvv.variation_type_id
  where pvv.variant_id = p_variant_id
$$;

-- ---------------------------------------------------------------------------
-- Inserts the items of a sale and returns nothing; sale totals are updated.
-- The amount received is given for the whole order and split across items in
-- proportion to their gross amount; the rounding remainder goes to the item
-- with the largest gross amount.
--
-- p_items: [{ variant_id, quantity, gross_amount, unit_cost?, is_customized,
--             customization_notes }]
--   unit_cost omitted → current cost from variant_costs (then frozen).
-- ---------------------------------------------------------------------------
create or replace function private.insert_sale_items(
  p_sale_id uuid, p_received numeric, p_items jsonb, p_move_stock boolean
)
returns void
language plpgsql
as $$
declare
  v_sale public.sales;
  v_item jsonb;
  v_idx integer := 0;
  v_count integer;
  v_gross_total numeric := 0;
  v_largest integer := 0;
  v_largest_gross numeric := -1;
  v_allocated numeric := 0;
  v_received numeric;
  v_gross numeric;
  v_qty integer;
  v_unit_cost numeric;
  v_total_cost numeric;
  v_product public.products;
  v_variant public.product_variants;
  v_line public.sale_items;
  v_material record;
begin
  select * into v_sale from public.sales where id = p_sale_id;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe pelo menos um produto na venda';
  end if;
  if p_received is null or p_received < 0 then
    raise exception 'O valor recebido não pode ser negativo';
  end if;
  v_count = jsonb_array_length(p_items);

  -- First pass: validate and find the totals.
  for v_item in select * from jsonb_array_elements(p_items) loop
    if (v_item ->> 'variant_id') is null then
      raise exception 'Selecione o produto e a variação';
    end if;
    if (v_item ->> 'quantity') is null or (v_item ->> 'quantity')::numeric <= 0
       or (v_item ->> 'quantity')::numeric <> trunc((v_item ->> 'quantity')::numeric) then
      raise exception 'A quantidade deve ser um número inteiro maior que zero';
    end if;
    if (v_item ->> 'gross_amount') is null or (v_item ->> 'gross_amount')::numeric < 0 then
      raise exception 'O preço bruto não pode ser negativo';
    end if;
    if (v_item ->> 'unit_cost') is not null and (v_item ->> 'unit_cost')::numeric < 0 then
      raise exception 'O custo não pode ser negativo';
    end if;

    v_gross = round((v_item ->> 'gross_amount')::numeric, 2);
    v_gross_total = v_gross_total + v_gross;
    if v_gross > v_largest_gross then
      v_largest_gross = v_gross;
      v_largest = v_idx;
    end if;
    v_idx = v_idx + 1;
  end loop;

  p_received = round(p_received, 2);
  if p_received > v_gross_total then
    raise exception 'O valor recebido não pode ser maior que o preço bruto';
  end if;

  -- Received share of every item except the largest one (which takes the rest).
  v_idx = 0;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if v_idx <> v_largest and v_gross_total > 0 then
      v_allocated = v_allocated
        + round(p_received * round((v_item ->> 'gross_amount')::numeric, 2) / v_gross_total, 2);
    end if;
    v_idx = v_idx + 1;
  end loop;

  -- Second pass: insert.
  v_idx = 0;
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_variant from public.product_variants where id = (v_item ->> 'variant_id')::uuid;
    if not found then
      raise exception 'Variação não encontrada';
    end if;
    select * into v_product from public.products where id = v_variant.product_id;

    v_qty = (v_item ->> 'quantity')::integer;
    v_gross = round((v_item ->> 'gross_amount')::numeric, 2);
    if v_gross_total = 0 then
      v_received = 0;
    elsif v_idx = v_largest then
      v_received = p_received - v_allocated;
    else
      v_received = round(p_received * v_gross / v_gross_total, 2);
    end if;

    if (v_item ->> 'unit_cost') is not null then
      v_unit_cost = round((v_item ->> 'unit_cost')::numeric, 6);
    else
      select unit_cost into v_unit_cost from public.variant_costs where variant_id = v_variant.id;
    end if;
    v_total_cost = round(v_unit_cost * v_qty, 2);

    insert into public.sale_items (
      sale_id, variant_id, quantity, unit_price, gross_amount, received_amount, fees,
      unit_cost, total_cost, profit, is_customized, customization_notes,
      product_name, sku, variant_label
    ) values (
      p_sale_id, v_variant.id, v_qty, round(v_gross / v_qty, 2), v_gross, v_received,
      v_gross - v_received, v_unit_cost, v_total_cost, v_received - v_total_cost,
      coalesce((v_item ->> 'is_customized')::boolean, false),
      nullif(trim(v_item ->> 'customization_notes'), ''),
      v_product.name, v_variant.sku, private.variant_label(v_variant.id)
    )
    returning * into v_line;

    if p_move_stock then
      if v_product.stock_mode = 'stocked' then
        insert into public.stock_movements (
          product_variant_id, movement_type, quantity, unit_cost, reason, sale_item_id, occurred_at
        ) values (
          v_variant.id, 'OUT', -v_qty, v_unit_cost, 'sale', v_line.id,
          private.movement_ts(v_sale.sale_date)
        );
      elsif v_product.auto_deduct_materials then
        for v_material in select * from private.variant_materials(v_variant.id) loop
          insert into public.stock_movements (
            inventory_item_id, movement_type, quantity, unit_cost, reason, sale_item_id, occurred_at
          ) values (
            v_material.inventory_item_id, 'OUT', -(v_material.quantity * v_qty), null, 'sale',
            v_line.id, private.movement_ts(v_sale.sale_date)
          );
        end loop;
      end if;
    end if;

    v_idx = v_idx + 1;
  end loop;

  update public.sales s
     set gross_amount = t.gross, received_amount = t.received, fees = t.fees,
         total_cost = t.cost, profit = t.profit
    from (
      select sum(gross_amount) gross, sum(received_amount) received, sum(fees) fees,
             sum(total_cost) cost, sum(profit) profit
      from public.sale_items
      where sale_id = p_sale_id and deleted_at is null
    ) t
   where s.id = p_sale_id;
end
$$;

-- p: { sale_date, channel_id, received_amount, notes, items: [...] }
create or replace function public.create_sale(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform private.assert_member();

  if (p ->> 'sale_date') is null then
    raise exception 'Informe a data da venda';
  end if;
  if not exists (select 1 from public.sales_channels where id = (p ->> 'channel_id')::uuid) then
    raise exception 'Selecione o canal de venda';
  end if;

  insert into public.sales (sale_date, channel_id, notes)
  values ((p ->> 'sale_date')::date, (p ->> 'channel_id')::uuid, nullif(trim(p ->> 'notes'), ''))
  returning id into v_id;

  perform private.insert_sale_items(v_id, (p ->> 'received_amount')::numeric, p -> 'items', true);

  return v_id;
end
$$;

-- Replaces a sale's items. Stock movements of the old items are reversed and
-- applied again for the new ones. The UI sends the old unit_cost to keep the
-- historical cost, or omits it to recalculate from current costs.
create or replace function public.update_sale(p_sale_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_items uuid[];
  v_source text;
begin
  perform private.assert_member();

  select source into v_source from public.sales
   where id = p_sale_id and deleted_at is null
   for update;
  if not found then
    raise exception 'Venda não encontrada';
  end if;
  if (p ->> 'sale_date') is null then
    raise exception 'Informe a data da venda';
  end if;
  if not exists (select 1 from public.sales_channels where id = (p ->> 'channel_id')::uuid) then
    raise exception 'Selecione o canal de venda';
  end if;

  select array_agg(id) into v_old_items
  from public.sale_items where sale_id = p_sale_id and deleted_at is null;

  perform private.reverse_movements(p_sale_item_ids => v_old_items, p_notes => 'Venda editada');
  update public.sale_items set deleted_at = now() where id = any (v_old_items);

  update public.sales
     set sale_date = (p ->> 'sale_date')::date,
         channel_id = (p ->> 'channel_id')::uuid,
         notes = nullif(trim(p ->> 'notes'), '')
   where id = p_sale_id;

  -- Imported sales never moved stock, so editing them does not either.
  perform private.insert_sale_items(
    p_sale_id, (p ->> 'received_amount')::numeric, p -> 'items', v_source = 'app'
  );

  return p_sale_id;
end
$$;

create or replace function public.delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items uuid[];
begin
  perform private.assert_member();

  update public.sales set deleted_at = now()
   where id = p_sale_id and deleted_at is null;
  if not found then
    raise exception 'Venda não encontrada';
  end if;

  select array_agg(id) into v_items
  from public.sale_items where sale_id = p_sale_id and deleted_at is null;

  perform private.reverse_movements(p_sale_item_ids => v_items, p_notes => 'Venda excluída');
end
$$;

-- Flat view used by the sales list: one row per active item.
create view public.sale_lines
with (security_invoker = true)
as
select
  si.id,
  si.sale_id,
  s.sale_date,
  s.channel_id,
  c.name as channel_name,
  si.variant_id,
  v.product_id,
  p.category_id,
  si.product_name,
  si.sku,
  si.variant_label,
  si.quantity,
  si.unit_price,
  si.gross_amount,
  si.received_amount,
  si.fees,
  si.unit_cost,
  si.total_cost,
  si.profit,
  case when si.received_amount > 0
    then round(si.profit / si.received_amount * 100, 2) end as margin,
  si.is_customized,
  si.customization_notes,
  s.notes,
  s.source,
  s.created_at
from public.sale_items si
join public.sales s on s.id = si.sale_id
join public.sales_channels c on c.id = s.channel_id
join public.product_variants v on v.id = si.variant_id
join public.products p on p.id = v.product_id
where si.deleted_at is null and s.deleted_at is null;
