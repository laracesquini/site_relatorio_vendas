-- Withdrawals: money taken out of the business cash (owner's draw, a share of
-- what was sold). Cash out in the cash flow; never a cost, so profit is untouched.

create table public.cash_withdrawals (
  id uuid primary key default gen_random_uuid(),
  withdrawal_date date not null,
  description text not null check (length(trim(description)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  notes text,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cash_withdrawals_date_idx on public.cash_withdrawals (withdrawal_date) where deleted_at is null;

create trigger set_updated_at before update on public.cash_withdrawals
  for each row execute function private.set_updated_at();

alter table public.cash_withdrawals enable row level security;
create policy "members manage cash_withdrawals" on public.cash_withdrawals for all to authenticated
  using (private.is_member()) with check (private.is_member());

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
      (select min(income_date) from public.other_incomes where deleted_at is null),
      (select min(withdrawal_date) from public.cash_withdrawals where deleted_at is null)
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

-- outflows = purchases_out + withdrawals.
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
    select sale_date as day, received_amount as sales_in, 0::numeric as other_in,
           0::numeric as purchases_out, 0::numeric as withdrawals
    from public.sales where deleted_at is null and sale_date between v_from and v_to
    union all
    select income_date, 0, amount, 0, 0
    from public.other_incomes where deleted_at is null and income_date between v_from and v_to
    union all
    select purchase_date, 0, 0, total_amount, 0
    from public.purchases where deleted_at is null and purchase_date between v_from and v_to
    union all
    select withdrawal_date, 0, 0, 0, amount
    from public.cash_withdrawals where deleted_at is null and withdrawal_date between v_from and v_to
  ),
  series as (
    select b.bucket,
      coalesce(sum(m.sales_in), 0) as sales_in,
      coalesce(sum(m.other_in), 0) as other_in,
      coalesce(sum(m.purchases_out), 0) as purchases_out,
      coalesce(sum(m.withdrawals), 0) as withdrawals
    from buckets b
    left join movements m on date_trunc(v_bucket, m.day::timestamp)::date = b.bucket
    group by b.bucket
  ),
  running as (
    select *, sales_in + other_in - purchases_out - withdrawals as net,
      sum(sales_in + other_in - purchases_out - withdrawals) over (order by bucket) as cumulative
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
        'purchases_out', coalesce(sum(purchases_out), 0),
        'withdrawals', coalesce(sum(withdrawals), 0),
        'outflows', coalesce(sum(purchases_out + withdrawals), 0),
        'balance', coalesce(sum(sales_in + other_in - purchases_out - withdrawals), 0)
      ) from series),
    'series', coalesce((select jsonb_agg(jsonb_build_object(
        'date', bucket, 'sales_in', sales_in, 'other_in', other_in,
        'inflows', sales_in + other_in, 'purchases_out', purchases_out, 'withdrawals', withdrawals,
        'outflows', purchases_out + withdrawals, 'net', net, 'cumulative', cumulative
      ) order by bucket) from running), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end
$$;
