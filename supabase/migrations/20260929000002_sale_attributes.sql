-- Snapshot of the variant's attributes on each sale item, e.g.
-- {"Cor": "Azul", "Tamanho": "Pequeno"}, so the sales list can show Cor and
-- Tamanho as separate columns even if the product changes later.

create or replace function private.variant_attributes(p_variant_id uuid)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_object_agg(vt.name, vv.value), '{}'::jsonb)
  from public.product_variant_values pvv
  join public.variation_values vv on vv.id = pvv.variation_value_id
  join public.variation_types vt on vt.id = pvv.variation_type_id
  where pvv.variant_id = p_variant_id
$$;

alter table public.sale_items
  add column variant_attributes jsonb not null default '{}'::jsonb;

update public.sale_items
   set variant_attributes = private.variant_attributes(variant_id);

create or replace function private.snapshot_variant_attributes()
returns trigger
language plpgsql
as $$
begin
  if new.variant_attributes is null or new.variant_attributes = '{}'::jsonb then
    new.variant_attributes = private.variant_attributes(new.variant_id);
  end if;
  return new;
end
$$;

create trigger snapshot_variant_attributes before insert on public.sale_items
  for each row execute function private.snapshot_variant_attributes();

-- New columns go at the end (create or replace view cannot reorder them).
create or replace view public.sale_lines
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
  s.created_at,
  si.variant_attributes,
  cat.name as category_name,
  (select count(*) from public.sale_items x
    where x.sale_id = s.id and x.deleted_at is null)::integer as sale_item_count
from public.sale_items si
join public.sales s on s.id = si.sale_id
join public.sales_channels c on c.id = s.channel_id
join public.product_variants v on v.id = si.variant_id
join public.products p on p.id = v.product_id
left join public.categories cat on cat.id = p.category_id
where si.deleted_at is null and s.deleted_at is null;
