-- Reporting: one function returns everything the dashboard needs for a period,
-- computed from the stored sale snapshots (never from current product costs).
--
-- Sales profit and cash are kept apart:
--   profit            = received − cost of goods sold (sale snapshots)
--   purchases         = everything bought in the period (cash out)
--   operating result  = profit − operational expenses (categories flagged
--                       is_operational); material purchases are not subtracted,
--                       their cost reaches profit as material is consumed.

create or replace function public.report_overview(p_from date default null, p_to date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from date;
  v_to date;
  v_bucket text;
  v_result jsonb;
begin
  perform private.assert_member();

  v_to = coalesce(p_to, private.today());
  v_from = coalesce(
    p_from,
    least(
      (select min(sale_date) from public.sales where deleted_at is null),
      (select min(purchase_date) from public.purchases where deleted_at is null)
    ),
    v_to
  );
  if v_from > v_to then
    raise exception 'A data inicial deve ser anterior à final';
  end if;
  v_bucket = case when v_to - v_from > 62 then 'month' else 'day' end;

  with lines as (
    select * from public.sale_lines where sale_date between v_from and v_to
  ),
  purchase_lines as (
    select pi.total_amount, pi.category_id, c.name as category_name,
           coalesce(c.is_operational, false) as is_operational
    from public.purchase_items pi
    join public.purchases pu on pu.id = pi.purchase_id
    left join public.categories c on c.id = pi.category_id
    where pu.deleted_at is null and pi.deleted_at is null
      and pu.purchase_date between v_from and v_to
  ),
  totals as (
    select
      coalesce(sum(gross_amount), 0) as gross,
      coalesce(sum(received_amount), 0) as received,
      coalesce(sum(fees), 0) as fees,
      coalesce(sum(total_cost), 0) as cost,
      coalesce(sum(profit), 0) as profit,
      count(distinct sale_id) as sales_count,
      coalesce(sum(quantity), 0) as units
    from lines
  ),
  expenses as (
    select
      coalesce(sum(total_amount), 0) as purchases,
      coalesce(sum(total_amount) filter (where is_operational), 0) as operational
    from purchase_lines
  ),
  buckets as (
    select b::date as bucket
    from generate_series(
      date_trunc(v_bucket, v_from::timestamp),
      date_trunc(v_bucket, v_to::timestamp),
      ('1 ' || v_bucket)::interval
    ) b
  ),
  series as (
    select
      b.bucket,
      coalesce(sum(l.gross_amount), 0) as gross,
      coalesce(sum(l.received_amount), 0) as received,
      coalesce(sum(l.total_cost), 0) as cost,
      coalesce(sum(l.profit), 0) as profit,
      coalesce(sum(l.quantity), 0) as units
    from buckets b
    left join lines l on date_trunc(v_bucket, l.sale_date::timestamp)::date = b.bucket
    group by b.bucket
  ),
  by_channel as (
    select channel_id, max(channel_name) as name,
           sum(gross_amount) as gross, sum(received_amount) as received,
           sum(profit) as profit, count(distinct sale_id) as sales_count
    from lines group by channel_id
  ),
  by_product as (
    select l.product_id, p.name,
           sum(l.quantity) as units, sum(l.received_amount) as received, sum(l.profit) as profit
    from lines l
    join public.products p on p.id = l.product_id
    group by l.product_id, p.name
  ),
  by_cost_category as (
    select category_id, coalesce(max(category_name), 'Sem categoria') as name,
           bool_or(is_operational) as is_operational, sum(total_amount) as total
    from purchase_lines group by category_id
  )
  select jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'bucket', v_bucket,
    'summary', (
      select jsonb_build_object(
        'gross', t.gross,
        'received', t.received,
        'fees', t.fees,
        'cost', t.cost,
        'profit', t.profit,
        'sales_count', t.sales_count,
        'units', t.units,
        'average_ticket', case when t.sales_count > 0 then round(t.gross / t.sales_count, 2) end,
        'margin', case when t.received > 0 then round(t.profit / t.received * 100, 2) end,
        'purchases', e.purchases,
        'operational_expenses', e.operational,
        'operating_result', t.profit - e.operational
      )
      from totals t, expenses e
    ),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', bucket, 'gross', gross, 'received', received, 'cost', cost,
        'profit', profit, 'units', units
      ) order by bucket)
      from series
    ), '[]'::jsonb),
    'by_channel', coalesce((
      select jsonb_agg(jsonb_build_object(
        'channel_id', channel_id, 'name', name, 'gross', gross, 'received', received,
        'profit', profit, 'sales_count', sales_count
      ) order by received desc, name)
      from by_channel
    ), '[]'::jsonb),
    'top_by_units', coalesce((
      select jsonb_agg(x order by (x ->> 'units')::numeric desc, x ->> 'name')
      from (
        select jsonb_build_object('product_id', product_id, 'name', name, 'units', units,
                                  'received', received, 'profit', profit) as x
        from by_product order by units desc, name limit 10
      ) s
    ), '[]'::jsonb),
    'top_by_profit', coalesce((
      select jsonb_agg(x order by (x ->> 'profit')::numeric desc, x ->> 'name')
      from (
        select jsonb_build_object('product_id', product_id, 'name', name, 'units', units,
                                  'received', received, 'profit', profit) as x
        from by_product order by profit desc, name limit 10
      ) s
    ), '[]'::jsonb),
    'costs_by_category', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category_id', category_id, 'name', name, 'is_operational', is_operational, 'total', total
      ) order by total desc, name)
      from by_cost_category
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end
$$;

revoke execute on function public.report_overview(date, date) from public, anon;
grant execute on function public.report_overview(date, date) to authenticated;

-- Items below their minimum: materials and finished (stocked) product variants.
create view public.low_stock
with (security_invoker = true)
as
select
  'material'::text as kind,
  ii.id,
  ii.name,
  null::text as detail,
  u.code as unit,
  ii.current_qty,
  ii.min_qty,
  ii.min_qty - ii.current_qty as shortfall
from public.inventory_items ii
join public.units u on u.id = ii.unit_id
where ii.archived_at is null and ii.min_qty > 0 and ii.current_qty < ii.min_qty
union all
select
  'product'::text,
  v.id,
  p.name,
  (
    select string_agg(vv.value, ' / ' order by vt.sort_order, vt.name)
    from public.product_variant_values pvv
    join public.variation_values vv on vv.id = pvv.variation_value_id
    join public.variation_types vt on vt.id = pvv.variation_type_id
    where pvv.variant_id = v.id
  ),
  'un',
  v.current_qty,
  v.min_stock,
  v.min_stock - v.current_qty
from public.product_variants v
join public.products p on p.id = v.product_id
where p.stock_mode = 'stocked' and p.archived_at is null and v.archived_at is null
  and v.is_active and v.min_stock > 0 and v.current_qty < v.min_stock;

-- Current value of what is in stock, at average cost.
create view public.stock_value
with (security_invoker = true)
as
select
  coalesce((select sum(current_qty * avg_cost) from public.inventory_items
            where archived_at is null and current_qty > 0), 0)::numeric(14,2) as materials,
  coalesce((select sum(v.current_qty * v.avg_cost) from public.product_variants v
            join public.products p on p.id = v.product_id
            where v.archived_at is null and p.archived_at is null and v.current_qty > 0), 0)::numeric(14,2)
    as finished_products;
