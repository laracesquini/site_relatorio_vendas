-- Row level security. Members can read everything. Catalog and settings tables
-- are edited directly; ledger tables (stock, purchases, sales, productions) are
-- read-only for clients and change only through the RPCs.

do $$
declare
  t text;
begin
  foreach t in array array[
    'units', 'categories', 'suppliers', 'sales_channels', 'variation_types',
    'variation_values', 'inventory_items', 'products', 'product_variants',
    'product_variant_values', 'product_materials', 'product_extra_costs', 'other_incomes'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members manage %1$s" on public.%1$I for all to authenticated
         using (private.is_member()) with check (private.is_member())', t);
  end loop;

  foreach t in array array[
    'stock_movements', 'productions', 'purchases', 'purchase_items', 'sales', 'sale_items'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members read %1$s" on public.%1$I for select to authenticated
         using (private.is_member())', t);
  end loop;
end
$$;

alter table public.members enable row level security;
create policy "users read own membership" on public.members
  for select to authenticated using (user_id = auth.uid());

-- RPCs are for signed-in members only (each also checks membership itself).
do $$
declare
  f text;
begin
  foreach f in array array[
    'register_stock_movement(text, numeric, uuid, uuid, numeric, text, text, timestamptz)',
    'register_production(uuid, numeric, date, text)',
    'delete_production(uuid)',
    'register_purchase(jsonb)',
    'update_purchase(uuid, jsonb)',
    'delete_purchase(uuid)',
    'create_sale(jsonb)',
    'update_sale(uuid, jsonb)',
    'delete_sale(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;
