-- Saves a product together with its variants in one transaction.
--
-- p: {
--   id?, name, sku, description, category_id, is_active, is_customizable,
--   default_price, estimated_cost, stock_mode, auto_deduct_materials,
--   min_stock?,                     -- for the default variant (no variations)
--   variants: [{ id?, sku, price, cost_override, min_stock, is_active, value_ids: [] }]
-- }
--
-- An empty variants list means "no variations": the product keeps a single
-- hidden default variant whose SKU follows the product SKU.
-- Variants left out of the list are deleted, or archived when they already
-- have sales or stock history.

create or replace function private.variant_has_history(p_variant_id uuid)
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.sale_items where variant_id = p_variant_id)
      or exists (select 1 from public.stock_movements where product_variant_id = p_variant_id)
      or exists (select 1 from public.productions where variant_id = p_variant_id)
$$;

create or replace function public.save_product(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := (p ->> 'id')::uuid;
  v_sku text := trim(p ->> 'sku');
  v_variant jsonb;
  v_variant_id uuid;
  v_keep uuid[] := '{}';
  v_old record;
  v_value_ids uuid[];
begin
  perform private.assert_member();

  if coalesce(trim(p ->> 'name'), '') = '' then
    raise exception 'Informe o nome do produto';
  end if;
  if coalesce(v_sku, '') = '' then
    raise exception 'Informe o SKU do produto';
  end if;
  if coalesce((p ->> 'default_price')::numeric, 0) < 0
     or coalesce((p ->> 'estimated_cost')::numeric, 0) < 0 then
    raise exception 'Preço e custo não podem ser negativos';
  end if;

  if v_id is null then
    insert into public.products (
      name, sku, description, category_id, is_active, is_customizable, default_price,
      estimated_cost, stock_mode, auto_deduct_materials
    ) values (
      trim(p ->> 'name'), v_sku, nullif(trim(p ->> 'description'), ''),
      (p ->> 'category_id')::uuid,
      coalesce((p ->> 'is_active')::boolean, true),
      coalesce((p ->> 'is_customizable')::boolean, false),
      round(coalesce((p ->> 'default_price')::numeric, 0), 2),
      coalesce((p ->> 'estimated_cost')::numeric, 0),
      coalesce(p ->> 'stock_mode', 'made_to_order'),
      coalesce((p ->> 'auto_deduct_materials')::boolean, false)
    )
    returning id into v_id;
  else
    update public.products set
      name = trim(p ->> 'name'),
      sku = v_sku,
      description = nullif(trim(p ->> 'description'), ''),
      category_id = (p ->> 'category_id')::uuid,
      is_active = coalesce((p ->> 'is_active')::boolean, true),
      is_customizable = coalesce((p ->> 'is_customizable')::boolean, false),
      default_price = round(coalesce((p ->> 'default_price')::numeric, 0), 2),
      estimated_cost = coalesce((p ->> 'estimated_cost')::numeric, 0),
      stock_mode = coalesce(p ->> 'stock_mode', 'made_to_order'),
      auto_deduct_materials = coalesce((p ->> 'auto_deduct_materials')::boolean, false)
    where id = v_id;
    if not found then
      raise exception 'Produto não encontrado';
    end if;
  end if;

  if coalesce(jsonb_array_length(p -> 'variants'), 0) = 0 then
    -- No variations: one default variant mirroring the product SKU.
    select id into v_variant_id
    from public.product_variants where product_id = v_id and is_default;

    if v_variant_id is null then
      insert into public.product_variants (product_id, sku, is_default, min_stock)
      values (v_id, v_sku, true, coalesce((p ->> 'min_stock')::numeric, 0))
      returning id into v_variant_id;
    else
      update public.product_variants set
        sku = v_sku, price = null, cost_override = null, is_active = true, archived_at = null,
        min_stock = coalesce((p ->> 'min_stock')::numeric, 0)
      where id = v_variant_id;
      delete from public.product_variant_values where variant_id = v_variant_id;
    end if;
    v_keep = array[v_variant_id];
  else
    for v_variant in select * from jsonb_array_elements(p -> 'variants') loop
      if coalesce(trim(v_variant ->> 'sku'), '') = '' then
        raise exception 'Informe o SKU de todas as variações';
      end if;
      if coalesce((v_variant ->> 'price')::numeric, 0) < 0
         or coalesce((v_variant ->> 'cost_override')::numeric, 0) < 0
         or coalesce((v_variant ->> 'min_stock')::numeric, 0) < 0 then
        raise exception 'Preço, custo e estoque mínimo das variações não podem ser negativos';
      end if;

      select coalesce(array_agg(value::uuid), '{}') into v_value_ids
      from jsonb_array_elements_text(coalesce(v_variant -> 'value_ids', '[]'::jsonb));
      if cardinality(v_value_ids) = 0 then
        raise exception 'A variação % precisa de pelo menos um valor (cor, tamanho…)', v_variant ->> 'sku';
      end if;

      v_variant_id = (v_variant ->> 'id')::uuid;
      if v_variant_id is null then
        insert into public.product_variants (product_id, sku, price, cost_override, min_stock, is_active)
        values (
          v_id, trim(v_variant ->> 'sku'),
          round((v_variant ->> 'price')::numeric, 2),
          (v_variant ->> 'cost_override')::numeric,
          coalesce((v_variant ->> 'min_stock')::numeric, 0),
          coalesce((v_variant ->> 'is_active')::boolean, true)
        )
        returning id into v_variant_id;
      else
        update public.product_variants set
          sku = trim(v_variant ->> 'sku'),
          price = round((v_variant ->> 'price')::numeric, 2),
          cost_override = (v_variant ->> 'cost_override')::numeric,
          min_stock = coalesce((v_variant ->> 'min_stock')::numeric, 0),
          is_active = coalesce((v_variant ->> 'is_active')::boolean, true),
          is_default = false,
          archived_at = null
        where id = v_variant_id and product_id = v_id;
        if not found then
          raise exception 'Variação não pertence a este produto';
        end if;
        delete from public.product_variant_values where variant_id = v_variant_id;
      end if;

      insert into public.product_variant_values (variant_id, variation_type_id, variation_value_id)
      select v_variant_id, vv.variation_type_id, vv.id
      from public.variation_values vv
      where vv.id = any (v_value_ids);

      v_keep = v_keep || v_variant_id;
    end loop;

    if exists (
      select 1
      from (
        select pvv.variant_id, array_agg(pvv.variation_value_id order by pvv.variation_value_id) as combo
        from public.product_variant_values pvv
        where pvv.variant_id = any (v_keep)
        group by pvv.variant_id
      ) c
      group by combo
      having count(*) > 1
    ) then
      raise exception 'Existem variações repetidas (mesma combinação de valores)';
    end if;
  end if;

  -- Variants no longer listed: delete, or archive if they have history.
  for v_old in
    select id from public.product_variants
    where product_id = v_id and archived_at is null and not (id = any (v_keep))
  loop
    if private.variant_has_history(v_old.id) then
      update public.product_variants
         set archived_at = now(), is_active = false
       where id = v_old.id;
    else
      delete from public.product_variants where id = v_old.id;
    end if;
  end loop;

  return v_id;
end
$$;

-- Permanently removes a product that was never sold or moved in stock.
create or replace function public.delete_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.assert_member();

  if exists (
    select 1 from public.product_variants v
    where v.product_id = p_product_id and private.variant_has_history(v.id)
  ) then
    raise exception 'Este produto tem vendas ou movimentações de estoque. Arquive-o em vez de excluir.';
  end if;

  delete from public.product_variants where product_id = p_product_id;
  delete from public.products where id = p_product_id;
  if not found then
    raise exception 'Produto não encontrado';
  end if;
end
$$;

revoke execute on function public.save_product(jsonb) from public, anon;
grant execute on function public.save_product(jsonb) to authenticated;
revoke execute on function public.delete_product(uuid) from public, anon;
grant execute on function public.delete_product(uuid) to authenticated;
