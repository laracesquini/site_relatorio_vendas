-- Reports: detailed results (profit side) and cash flow (cash side), kept apart.
--
--   Profit    = received − cost of goods sold, from sale snapshots.
--   Cash flow = money in (amounts received from sales + other income)
--               − money out (purchases and expenses), by date.
-- Buying material is cash out today and cost only as it is used, so the two
-- numbers differ on purpose.

create or replace function private.report_range(p_from date, p_to date, p_bucket text)
returns table (range_from date, range_to date, bucket text)
language plpgsql
stable
as $$
declare
  v_to date := coalesce(p_to, private.today());
  v_from date;
begin
  v_from = coalesce(
    p_from,
    least(
      (select min(sale_date) from public.sales where deleted_at is null),
      (select min(purchase_date) from public.purchases where deleted_at is null),
      (select min(income_date) from public.other_incomes where deleted_at is null)
    ),
    v_to
  );
  if v_from > v_to then
    raise exception 'A data inicial deve ser anterior à final';
  end if;
  if p_bucket is not null and p_bucket not in ('day', 'week', 'month') then
    raise exception 'Agrupamento inválido: %', p_bucket;
  end if;
  return query select v_from, v_to,
    coalesce(p_bucket, case when v_to - v_from > 62 then 'month' else 'day' end);
end
$$;

create or replace function public.report_details(
  p_from date default null, p_to date default null, p_bucket text default null
)
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
  select range_from, range_to, bucket into v_from, v_to, v_bucket from private.report_range(p_from, p_to, p_bucket);

  with lines as (
    select * from public.sale_lines where sale_date between v_from and v_to
  ),
  purchase_rows as (
    select pi.total_amount, pi.add_to_stock, pi.category_id, pu.purchase_date,
           c.name as category_name, coalesce(c.is_operational, false) as is_operational
    from public.purchase_items pi
    join public.purchases pu on pu.id = pi.purchase_id
    left join public.categories c on c.id = pi.category_id
    where pu.deleted_at is null and pi.deleted_at is null
      and pu.purchase_date between v_from and v_to
  ),
  buckets as (
    select b::date as bucket
    from generate_series(
      date_trunc(v_bucket, v_from::timestamp), date_trunc(v_bucket, v_to::timestamp),
      ('1 ' || v_bucket)::interval
    ) b
  ),
  series as (
    select b.bucket,
      coalesce(sum(l.gross_amount), 0) as gross,
      coalesce(sum(l.received_amount), 0) as received,
      coalesce(sum(l.fees), 0) as fees,
      coalesce(sum(l.total_cost), 0) as cost,
      coalesce(sum(l.profit), 0) as profit,
      coalesce(sum(l.quantity), 0) as units,
      count(distinct l.sale_id) as sales_count
    from buckets b
    left join lines l on date_trunc(v_bucket, l.sale_date::timestamp)::date = b.bucket
    group by b.bucket
  ),
  cost_series as (
    select b.bucket,
      coalesce(sum(r.total_amount) filter (where r.add_to_stock), 0) as to_stock,
      coalesce(sum(r.total_amount) filter (where not r.add_to_stock and r.is_operational), 0) as operational,
      coalesce(sum(r.total_amount) filter (where not r.add_to_stock and not r.is_operational), 0) as other,
      coalesce(sum(r.total_amount), 0) as total
    from buckets b
    left join purchase_rows r on date_trunc(v_bucket, r.purchase_date::timestamp)::date = b.bucket
    group by b.bucket
  ),
  by_product as (
    select l.product_id, p.name, cat.name as category_name,
      sum(l.quantity) as units, count(distinct l.sale_id) as sales_count,
      sum(l.gross_amount) as gross, sum(l.received_amount) as received, sum(l.fees) as fees,
      sum(l.total_cost) as cost, sum(l.profit) as profit
    from lines l
    join public.products p on p.id = l.product_id
    left join public.categories cat on cat.id = p.category_id
    group by l.product_id, p.name, cat.name
  ),
  by_channel as (
    select channel_id, max(channel_name) as name,
      sum(quantity) as units, count(distinct sale_id) as sales_count,
      sum(gross_amount) as gross, sum(received_amount) as received, sum(fees) as fees,
      sum(total_cost) as cost, sum(profit) as profit
    from lines group by channel_id
  ),
  by_category as (
    select category_id, coalesce(max(category_name), 'Sem categoria') as name,
      sum(quantity) as units, sum(gross_amount) as gross, sum(received_amount) as received,
      sum(total_cost) as cost, sum(profit) as profit
    from lines group by category_id
  ),
  by_cost_category as (
    select category_id, coalesce(max(category_name), 'Sem categoria') as name,
      case
        when bool_and(add_to_stock) then 'stock'
        when bool_or(is_operational) and not bool_or(add_to_stock) then 'operational'
        else 'other'
      end as kind,
      sum(total_amount) as total,
      sum(total_amount) filter (where add_to_stock) as to_stock
    from purchase_rows group by category_id
  )
  select jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'bucket', v_bucket,
    'series', coalesce((select jsonb_agg(jsonb_build_object(
        'date', bucket, 'gross', gross, 'received', received, 'fees', fees, 'cost', cost,
        'profit', profit, 'units', units, 'sales_count', sales_count,
        'margin', case when received > 0 then round(profit / received * 100, 2) end
      ) order by bucket) from series), '[]'::jsonb),
    'cost_series', coalesce((select jsonb_agg(jsonb_build_object(
        'date', bucket, 'to_stock', to_stock, 'operational', operational, 'other', other, 'total', total
      ) order by bucket) from cost_series), '[]'::jsonb),
    'by_product', coalesce((select jsonb_agg(jsonb_build_object(
        'product_id', product_id, 'name', name, 'category_name', category_name,
        'units', units, 'sales_count', sales_count, 'gross', gross, 'received', received,
        'fees', fees, 'cost', cost, 'profit', profit,
        'margin', case when received > 0 then round(profit / received * 100, 2) end
      ) order by profit desc, name) from by_product), '[]'::jsonb),
    'by_channel', coalesce((select jsonb_agg(jsonb_build_object(
        'channel_id', channel_id, 'name', name, 'units', units, 'sales_count', sales_count,
        'gross', gross, 'received', received, 'fees', fees, 'cost', cost, 'profit', profit,
        'fee_percent', case when gross > 0 then round(fees / gross * 100, 2) end,
        'margin', case when received > 0 then round(profit / received * 100, 2) end
      ) order by received desc, name) from by_channel), '[]'::jsonb),
    'by_category', coalesce((select jsonb_agg(jsonb_build_object(
        'category_id', category_id, 'name', name, 'units', units, 'gross', gross,
        'received', received, 'cost', cost, 'profit', profit,
        'margin', case when received > 0 then round(profit / received * 100, 2) end
      ) order by received desc, name) from by_category), '[]'::jsonb),
    'costs_by_category', coalesce((select jsonb_agg(jsonb_build_object(
        'category_id', category_id, 'name', name, 'kind', kind, 'total', total
      ) order by total desc, name) from by_cost_category), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end
$$;

create or replace function public.report_cash_flow(
  p_from date default null, p_to date default null, p_bucket text default null
)
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
  select range_from, range_to, bucket into v_from, v_to, v_bucket from private.report_range(p_from, p_to, p_bucket);

  with buckets as (
    select b::date as bucket
    from generate_series(
      date_trunc(v_bucket, v_from::timestamp), date_trunc(v_bucket, v_to::timestamp),
      ('1 ' || v_bucket)::interval
    ) b
  ),
  movements as (
    select sale_date as day, received_amount as sales_in, 0::numeric as other_in, 0::numeric as money_out
    from public.sales where deleted_at is null and sale_date between v_from and v_to
    union all
    select income_date, 0, amount, 0
    from public.other_incomes where deleted_at is null and income_date between v_from and v_to
    union all
    select purchase_date, 0, 0, total_amount
    from public.purchases where deleted_at is null and purchase_date between v_from and v_to
  ),
  series as (
    select b.bucket,
      coalesce(sum(m.sales_in), 0) as sales_in,
      coalesce(sum(m.other_in), 0) as other_in,
      coalesce(sum(m.money_out), 0) as money_out
    from buckets b
    left join movements m on date_trunc(v_bucket, m.day::timestamp)::date = b.bucket
    group by b.bucket
  ),
  running as (
    select *, sales_in + other_in - money_out as net,
      sum(sales_in + other_in - money_out) over (order by bucket) as cumulative
    from series
  )
  select jsonb_build_object(
    'from', v_from,
    'to', v_to,
    'bucket', v_bucket,
    'totals', (select jsonb_build_object(
        'sales_in', coalesce(sum(sales_in), 0),
        'other_in', coalesce(sum(other_in), 0),
        'inflows', coalesce(sum(sales_in + other_in), 0),
        'outflows', coalesce(sum(money_out), 0),
        'balance', coalesce(sum(sales_in + other_in - money_out), 0)
      ) from series),
    'series', coalesce((select jsonb_agg(jsonb_build_object(
        'date', bucket, 'sales_in', sales_in, 'other_in', other_in,
        'inflows', sales_in + other_in, 'outflows', money_out, 'net', net, 'cumulative', cumulative
      ) order by bucket) from running), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end
$$;

revoke execute on function public.report_details(date, date, text) from public, anon;
grant execute on function public.report_details(date, date, text) to authenticated;
revoke execute on function public.report_cash_flow(date, date, text) from public, anon;
grant execute on function public.report_cash_flow(date, date, text) to authenticated;
