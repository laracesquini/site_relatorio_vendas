-- Inventory screens: saving materials (with opening stock), adjusting to a
-- counted quantity, and a readable movement history.

-- p: { id?, name, category_id, unit_id, min_qty, supplier_id, notes,
--      initial_qty?, initial_unit_cost? }   (initial_* only when creating)
create or replace function public.save_inventory_item(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := (p ->> 'id')::uuid;
  v_unit uuid := (p ->> 'unit_id')::uuid;
  v_initial numeric := (p ->> 'initial_qty')::numeric;
  v_cost numeric := (p ->> 'initial_unit_cost')::numeric;
begin
  perform private.assert_member();

  if coalesce(trim(p ->> 'name'), '') = '' then
    raise exception 'Informe o nome do insumo';
  end if;
  if v_unit is null then
    raise exception 'Selecione a unidade de medida';
  end if;
  if coalesce((p ->> 'min_qty')::numeric, 0) < 0 then
    raise exception 'O estoque mínimo não pode ser negativo';
  end if;
  if v_initial is not null and v_initial < 0 or v_cost is not null and v_cost < 0 then
    raise exception 'Quantidade e custo iniciais não podem ser negativos';
  end if;

  if v_id is null then
    insert into public.inventory_items (name, category_id, unit_id, min_qty, supplier_id, notes)
    values (
      trim(p ->> 'name'), (p ->> 'category_id')::uuid, v_unit,
      coalesce((p ->> 'min_qty')::numeric, 0), (p ->> 'supplier_id')::uuid,
      nullif(trim(p ->> 'notes'), '')
    )
    returning id into v_id;

    if coalesce(v_initial, 0) > 0 then
      insert into public.stock_movements (inventory_item_id, movement_type, quantity, unit_cost, reason, notes)
      values (v_id, 'IN', v_initial, coalesce(v_cost, 0), 'manual', 'Estoque inicial');
    end if;
  else
    -- Quantities are expressed in the unit; changing it later would make the
    -- history meaningless (100 g silently becoming 100 kg).
    if exists (
      select 1 from public.inventory_items i
      where i.id = v_id and i.unit_id <> v_unit
        and exists (select 1 from public.stock_movements m where m.inventory_item_id = v_id)
    ) then
      raise exception 'A unidade não pode ser alterada depois que o insumo tem movimentações';
    end if;

    update public.inventory_items set
      name = trim(p ->> 'name'),
      category_id = (p ->> 'category_id')::uuid,
      unit_id = v_unit,
      min_qty = coalesce((p ->> 'min_qty')::numeric, 0),
      supplier_id = (p ->> 'supplier_id')::uuid,
      notes = nullif(trim(p ->> 'notes'), '')
    where id = v_id;
    if not found then
      raise exception 'Insumo não encontrado';
    end if;
  end if;

  return v_id;
end
$$;

-- Physical count: records the difference between the counted quantity and the
-- current balance as an ADJUSTMENT. Returns null when nothing changed.
create or replace function public.adjust_stock_to(
  p_counted numeric,
  p_inventory_item_id uuid default null,
  p_product_variant_id uuid default null,
  p_notes text default null,
  p_occurred_at timestamptz default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current numeric;
  v_row public.stock_movements;
begin
  perform private.assert_member();

  if p_counted is null or p_counted < 0 then
    raise exception 'Informe a quantidade contada (zero ou mais)';
  end if;
  if num_nonnulls(p_inventory_item_id, p_product_variant_id) <> 1 then
    raise exception 'Informe o item a ajustar';
  end if;

  -- Lock the row so a concurrent movement cannot change the balance in between.
  if p_inventory_item_id is not null then
    select current_qty into v_current from public.inventory_items
     where id = p_inventory_item_id for update;
  else
    select current_qty into v_current from public.product_variants
     where id = p_product_variant_id for update;
  end if;
  if not found then
    raise exception 'Item de estoque não encontrado';
  end if;

  if p_counted = v_current then
    return null;
  end if;

  insert into public.stock_movements (
    inventory_item_id, product_variant_id, movement_type, quantity, unit_cost, reason, notes, occurred_at
  ) values (
    p_inventory_item_id, p_product_variant_id, 'ADJUSTMENT', p_counted - v_current, null, 'manual',
    coalesce(nullif(trim(p_notes), ''), 'Ajuste de inventário'), coalesce(p_occurred_at, now())
  )
  returning * into v_row;

  return v_row;
end
$$;

revoke execute on function public.save_inventory_item(jsonb) from public, anon;
grant execute on function public.save_inventory_item(jsonb) to authenticated;
revoke execute on function public.adjust_stock_to(numeric, uuid, uuid, text, timestamptz) from public, anon;
grant execute on function public.adjust_stock_to(numeric, uuid, uuid, text, timestamptz) to authenticated;

-- Movement history with names and origin, for the Estoque screens.
create view public.stock_movement_history
with (security_invoker = true)
as
select
  m.id,
  m.occurred_at,
  m.created_at,
  m.movement_type,
  m.quantity,
  m.unit_cost,
  m.balance_after,
  m.avg_cost_after,
  m.reason,
  m.notes,
  m.created_by,
  m.inventory_item_id,
  m.product_variant_id,
  case when m.inventory_item_id is not null then 'material' else 'product' end as kind,
  coalesce(ii.name, p.name) as item_name,
  (
    select string_agg(vv.value, ' / ' order by vt.sort_order, vt.name)
    from public.product_variant_values pvv
    join public.variation_values vv on vv.id = pvv.variation_value_id
    join public.variation_types vt on vt.id = pvv.variation_type_id
    where pvv.variant_id = m.product_variant_id
  ) as variant_label,
  coalesce(u.code, 'un') as unit,
  m.reverses_movement_id,
  si.sale_id,
  si.product_name as sale_product_name,
  pi.purchase_id,
  pi.description as purchase_description,
  m.production_id
from public.stock_movements m
left join public.inventory_items ii on ii.id = m.inventory_item_id
left join public.units u on u.id = ii.unit_id
left join public.product_variants v on v.id = m.product_variant_id
left join public.products p on p.id = v.product_id
left join public.sale_items si on si.id = m.sale_item_id
left join public.purchase_items pi on pi.id = m.purchase_item_id;
