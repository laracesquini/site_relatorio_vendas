-- One row per active purchase line, for the Compras list (like the old
-- spreadsheet's Item / Quantidade / Preço section).
create view public.purchase_lines
with (security_invoker = true)
as
select
  pi.id,
  pi.purchase_id,
  pu.purchase_date,
  pu.supplier_id,
  s.name as supplier_name,
  pu.notes as purchase_notes,
  pi.description,
  pi.category_id,
  c.name as category_name,
  coalesce(c.is_operational, false) as is_operational,
  pi.inventory_item_id,
  ii.name as inventory_item_name,
  u.code as stock_unit,
  pi.quantity,
  pi.total_amount,
  pi.unit_price,
  pi.add_to_stock,
  pi.stock_qty_per_unit,
  case when pi.add_to_stock then pi.quantity * pi.stock_qty_per_unit end as stock_quantity,
  case when pi.add_to_stock
    then round(pi.total_amount / (pi.quantity * pi.stock_qty_per_unit), 6) end as stock_unit_cost,
  (select count(*) from public.purchase_items x
    where x.purchase_id = pu.id and x.deleted_at is null)::integer as purchase_item_count,
  pu.total_amount as purchase_total,
  pu.created_at
from public.purchase_items pi
join public.purchases pu on pu.id = pi.purchase_id
left join public.suppliers s on s.id = pu.supplier_id
left join public.categories c on c.id = pi.category_id
left join public.inventory_items ii on ii.id = pi.inventory_item_id
left join public.units u on u.id = ii.unit_id
where pi.deleted_at is null and pu.deleted_at is null;
