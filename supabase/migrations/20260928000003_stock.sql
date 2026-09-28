-- Stock ledger. Quantities never change by editing a number: every change is a
-- row in stock_movements, and a trigger updates the cached current_qty/avg_cost
-- of the item or variant in the same transaction. Movements are immutable;
-- corrections are made with reversal movements.

create table public.productions (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  produced_at date not null default private.today(),
  unit_cost numeric(14,6) not null default 0 check (unit_cost >= 0),
  notes text,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid references public.inventory_items (id) on delete restrict,
  product_variant_id uuid references public.product_variants (id) on delete restrict,
  movement_type text not null check (movement_type in ('IN', 'OUT', 'ADJUSTMENT')),
  -- Signed: IN > 0, OUT < 0, ADJUSTMENT either way.
  quantity numeric(14,3) not null check (quantity <> 0),
  -- Cost per unit at the moment of the movement (never rewritten later).
  -- Omitted → filled with the current average by apply_stock_movement.
  unit_cost numeric(14,6) not null check (unit_cost >= 0),
  reason text not null check (
    reason in ('purchase', 'sale', 'production', 'manual', 'loss', 'reversal', 'import')
  ),
  purchase_item_id uuid,
  sale_item_id uuid,
  production_id uuid references public.productions (id) on delete restrict,
  reverses_movement_id uuid unique references public.stock_movements (id) on delete restrict,
  -- Snapshot of the balance right after this movement, for the history view.
  balance_after numeric(14,3) not null default 0,
  avg_cost_after numeric(14,6) not null default 0,
  occurred_at timestamptz not null default now(),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (num_nonnulls(inventory_item_id, product_variant_id) = 1),
  check (
    (movement_type = 'IN' and quantity > 0)
    or (movement_type = 'OUT' and quantity < 0)
    or movement_type = 'ADJUSTMENT'
  )
);
create index stock_movements_item_idx on public.stock_movements (inventory_item_id, occurred_at desc);
create index stock_movements_variant_idx on public.stock_movements (product_variant_id, occurred_at desc);
create index stock_movements_sale_item_idx on public.stock_movements (sale_item_id);
create index stock_movements_purchase_item_idx on public.stock_movements (purchase_item_id);
create index stock_movements_production_idx on public.stock_movements (production_id);

-- ---------------------------------------------------------------------------
-- Cached balances are written only by the movement trigger.
-- ---------------------------------------------------------------------------
create or replace function private.guard_stock_columns()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('app.stock_write', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.current_qty = 0;
    new.avg_cost = 0;
  elsif new.current_qty is distinct from old.current_qty
     or new.avg_cost is distinct from old.avg_cost then
    raise exception 'O estoque só pode ser alterado por movimentações'
      using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger guard_stock_columns before insert or update on public.inventory_items
  for each row execute function private.guard_stock_columns();
create trigger guard_stock_columns before insert or update on public.product_variants
  for each row execute function private.guard_stock_columns();

-- Weighted average cost.
--   IN:  avg = (qty·avg + in_qty·in_cost) / (qty + in_qty); if qty <= 0, avg = in_cost
--   Reversal of an IN (OUT, reason 'reversal'): the same formula with a negative
--        quantity, which removes that purchase from the average.
--   OUT / ADJUSTMENT: average unchanged.
create or replace function private.next_avg_cost(
  p_qty numeric, p_avg numeric, p_delta numeric, p_unit_cost numeric,
  p_type text, p_is_in_reversal boolean
)
returns numeric
language sql
immutable
as $$
  select case
    when p_type = 'IN' and p_qty <= 0 then p_unit_cost
    when p_type = 'IN' then (p_qty * p_avg + p_delta * p_unit_cost) / (p_qty + p_delta)
    when p_is_in_reversal and p_qty + p_delta > 0
      then greatest(0, (p_qty * p_avg + p_delta * p_unit_cost) / (p_qty + p_delta))
    else p_avg
  end
$$;

create or replace function private.apply_stock_movement()
returns trigger
language plpgsql
as $$
declare
  v_qty numeric;
  v_avg numeric;
  v_new_avg numeric;
  v_is_in_reversal boolean := false;
begin
  if new.inventory_item_id is not null then
    select current_qty, avg_cost into v_qty, v_avg
    from public.inventory_items where id = new.inventory_item_id for update;
  else
    select current_qty, avg_cost into v_qty, v_avg
    from public.product_variants where id = new.product_variant_id for update;
  end if;

  if not found then
    raise exception 'Item de estoque não encontrado';
  end if;

  -- A movement without an explicit cost is valued at the current average, so an
  -- IN without a cost does not drag the average down.
  if new.unit_cost is null then
    new.unit_cost = v_avg;
  end if;

  if new.reverses_movement_id is not null then
    select movement_type = 'IN' into v_is_in_reversal
    from public.stock_movements where id = new.reverses_movement_id;
  end if;

  v_new_avg = round(private.next_avg_cost(
    v_qty, v_avg, new.quantity, new.unit_cost, new.movement_type, coalesce(v_is_in_reversal, false)
  ), 6);

  new.balance_after = v_qty + new.quantity;
  new.avg_cost_after = v_new_avg;

  perform set_config('app.stock_write', 'on', true);
  if new.inventory_item_id is not null then
    update public.inventory_items
       set current_qty = new.balance_after, avg_cost = v_new_avg
     where id = new.inventory_item_id;
  else
    update public.product_variants
       set current_qty = new.balance_after, avg_cost = v_new_avg
     where id = new.product_variant_id;
  end if;
  perform set_config('app.stock_write', 'off', true);

  return new;
end
$$;

create trigger apply_stock_movement before insert on public.stock_movements
  for each row execute function private.apply_stock_movement();

create or replace function private.forbid_change()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Registros de % não podem ser alterados; use um estorno', tg_table_name
    using errcode = '42501';
end
$$;

create trigger stock_movements_immutable before update or delete on public.stock_movements
  for each row execute function private.forbid_change();

-- Inserts a reversal for every not-yet-reversed movement matching the filter.
create or replace function private.reverse_movements(
  p_sale_item_ids uuid[] default null,
  p_purchase_item_ids uuid[] default null,
  p_production_id uuid default null,
  p_notes text default null
)
returns void
language plpgsql
as $$
declare
  m public.stock_movements;
begin
  for m in
    select sm.* from public.stock_movements sm
    where sm.reverses_movement_id is null
      and not exists (
        select 1 from public.stock_movements r where r.reverses_movement_id = sm.id
      )
      and (
        (p_sale_item_ids is not null and sm.sale_item_id = any (p_sale_item_ids))
        or (p_purchase_item_ids is not null and sm.purchase_item_id = any (p_purchase_item_ids))
        or (p_production_id is not null and sm.production_id = p_production_id)
      )
    order by sm.created_at, sm.id
  loop
    insert into public.stock_movements (
      inventory_item_id, product_variant_id, movement_type, quantity, unit_cost,
      reason, purchase_item_id, sale_item_id, production_id, reverses_movement_id, notes
    ) values (
      m.inventory_item_id, m.product_variant_id,
      case m.movement_type when 'IN' then 'OUT' when 'OUT' then 'IN' else 'ADJUSTMENT' end,
      -m.quantity, m.unit_cost,
      'reversal', m.purchase_item_id, m.sale_item_id, m.production_id, m.id, p_notes
    );
  end loop;
end
$$;

-- Materials consumed by one unit of a variant (the resolved cost sheet).
create or replace function private.variant_materials(p_variant_id uuid)
returns table (inventory_item_id uuid, quantity numeric)
language sql
stable
as $$
  select pm.inventory_item_id, pm.quantity
  from public.product_variants v
  join public.product_materials pm on pm.product_id = v.product_id
  where v.id = p_variant_id
    and (
      pm.variant_id = v.id
      or (
        pm.variant_id is null
        and not exists (
          select 1 from public.product_materials own where own.variant_id = v.id
        )
      )
    )
$$;

-- ---------------------------------------------------------------------------
-- RPC: manual movement (initial stock, count adjustment, loss, manual use).
-- ---------------------------------------------------------------------------
create or replace function public.register_stock_movement(
  p_movement_type text,
  p_quantity numeric,
  p_inventory_item_id uuid default null,
  p_product_variant_id uuid default null,
  p_unit_cost numeric default null,
  p_reason text default 'manual',
  p_notes text default null,
  p_occurred_at timestamptz default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.stock_movements;
  v_qty numeric;
begin
  perform private.assert_member();

  if p_reason not in ('manual', 'loss') then
    raise exception 'Motivo inválido para movimentação manual: %', p_reason;
  end if;
  if p_quantity is null or p_quantity = 0 then
    raise exception 'Informe uma quantidade diferente de zero';
  end if;
  if p_unit_cost is not null and p_unit_cost < 0 then
    raise exception 'O custo unitário não pode ser negativo';
  end if;

  -- The user types a positive amount for IN/OUT; the sign comes from the type.
  v_qty = case p_movement_type
    when 'IN' then abs(p_quantity)
    when 'OUT' then -abs(p_quantity)
    when 'ADJUSTMENT' then p_quantity
  end;
  if v_qty is null then
    raise exception 'Tipo de movimentação inválido: %', p_movement_type;
  end if;

  insert into public.stock_movements (
    inventory_item_id, product_variant_id, movement_type, quantity, unit_cost,
    reason, notes, occurred_at
  ) values (
    -- null cost → valued at the current average (see apply_stock_movement)
    p_inventory_item_id, p_product_variant_id, p_movement_type, v_qty,
    p_unit_cost, p_reason, p_notes, coalesce(p_occurred_at, now())
  )
  returning * into v_row;

  return v_row;
end
$$;

-- ---------------------------------------------------------------------------
-- RPC: production of a stocked product — consumes materials, adds units.
-- ---------------------------------------------------------------------------
create or replace function public.register_production(
  p_variant_id uuid,
  p_quantity numeric,
  p_produced_at date default null,
  p_notes text default null
)
returns public.productions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prod public.productions;
  v_material record;
  v_material_cost numeric := 0;
  v_extra numeric;
  v_item_cost numeric;
  v_has_materials boolean := false;
begin
  perform private.assert_member();

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade produzida deve ser maior que zero';
  end if;
  if not exists (
    select 1 from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = p_variant_id and p.stock_mode = 'stocked'
  ) then
    raise exception 'Produção só pode ser registrada para produtos com estoque pronto';
  end if;

  insert into public.productions (variant_id, quantity, produced_at, notes)
  values (p_variant_id, p_quantity, coalesce(p_produced_at, private.today()), p_notes)
  returning * into v_prod;

  for v_material in select * from private.variant_materials(p_variant_id) loop
    insert into public.stock_movements (
      inventory_item_id, movement_type, quantity, reason, production_id, occurred_at
    ) values (
      v_material.inventory_item_id, 'OUT', -(v_material.quantity * p_quantity),
      'production', v_prod.id, private.movement_ts(v_prod.produced_at)
    )
    returning unit_cost into v_item_cost;
    v_material_cost = v_material_cost + v_item_cost * v_material.quantity;
    v_has_materials = true;
  end loop;

  select coalesce(sum(e.amount), 0) into v_extra
  from public.product_extra_costs e
  join public.product_variants v on v.product_id = e.product_id
  where v.id = p_variant_id;

  -- Without a cost sheet, fall back to the variant's override/estimate.
  if not v_has_materials and v_extra = 0 then
    select unit_cost into v_material_cost from public.variant_costs where variant_id = p_variant_id;
  end if;

  update public.productions
     set unit_cost = round(v_material_cost + v_extra, 6)
   where id = v_prod.id
  returning * into v_prod;

  insert into public.stock_movements (
    product_variant_id, movement_type, quantity, unit_cost, reason, production_id, occurred_at
  ) values (
    p_variant_id, 'IN', p_quantity, v_prod.unit_cost, 'production', v_prod.id,
    private.movement_ts(v_prod.produced_at)
  );

  return v_prod;
end
$$;

create or replace function public.delete_production(p_production_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.assert_member();

  update public.productions set deleted_at = now()
   where id = p_production_id and deleted_at is null;
  if not found then
    raise exception 'Produção não encontrada';
  end if;

  perform private.reverse_movements(
    p_production_id => p_production_id, p_notes => 'Produção excluída'
  );
end
$$;
