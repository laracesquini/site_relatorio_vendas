-- Saves a product's whole cost sheet (bill of materials + extra costs) in one
-- transaction, replacing the previous one.
--
-- p: {
--   materials:   [{ inventory_item_id, quantity, variant_id? }]   -- variant_id: own sheet of that variant
--   extra_costs: [{ label, amount }]                              -- per unit, all variants
-- }
--
-- Past sales are unaffected: they keep the cost frozen when they were made.
create or replace function public.save_cost_sheet(p_product_id uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_order integer := 0;
begin
  perform private.assert_member();

  perform 1 from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Produto não encontrado';
  end if;

  for v_row in select * from jsonb_array_elements(coalesce(p -> 'materials', '[]'::jsonb)) loop
    if (v_row ->> 'inventory_item_id') is null then
      raise exception 'Selecione o insumo em todas as linhas da ficha';
    end if;
    if coalesce((v_row ->> 'quantity')::numeric, 0) <= 0 then
      raise exception 'A quantidade de cada insumo deve ser maior que zero';
    end if;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p -> 'materials', '[]'::jsonb)) m
    group by m ->> 'variant_id', m ->> 'inventory_item_id'
    having count(*) > 1
  ) then
    raise exception 'O mesmo insumo aparece duas vezes na ficha; some as quantidades em uma linha';
  end if;

  for v_row in select * from jsonb_array_elements(coalesce(p -> 'extra_costs', '[]'::jsonb)) loop
    if coalesce(trim(v_row ->> 'label'), '') = '' then
      raise exception 'Dê um nome a cada custo adicional';
    end if;
    if (v_row ->> 'amount') is null or (v_row ->> 'amount')::numeric < 0 then
      raise exception 'Os custos adicionais não podem ser negativos';
    end if;
  end loop;

  delete from public.product_materials where product_id = p_product_id;
  insert into public.product_materials (product_id, variant_id, inventory_item_id, quantity)
  select p_product_id, (m ->> 'variant_id')::uuid, (m ->> 'inventory_item_id')::uuid, (m ->> 'quantity')::numeric
  from jsonb_array_elements(coalesce(p -> 'materials', '[]'::jsonb)) m;

  delete from public.product_extra_costs where product_id = p_product_id;
  for v_row in select * from jsonb_array_elements(coalesce(p -> 'extra_costs', '[]'::jsonb)) loop
    v_order = v_order + 1;
    insert into public.product_extra_costs (product_id, label, amount, sort_order)
    values (p_product_id, trim(v_row ->> 'label'), (v_row ->> 'amount')::numeric, v_order);
  end loop;
end
$$;

revoke execute on function public.save_cost_sheet(uuid, jsonb) from public, anon;
grant execute on function public.save_cost_sheet(uuid, jsonb) to authenticated;
