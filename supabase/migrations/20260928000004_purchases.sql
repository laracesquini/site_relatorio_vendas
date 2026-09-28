-- Purchases and expenses (cash outflows) and other income (cash inflows).
-- A purchase line linked to an inventory item can create an IN movement, which
-- updates that item's weighted average cost. Buying material is never a sale
-- cost by itself: cost is recognised as material is consumed.

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_date date not null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  notes text,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchases_date_idx on public.purchases (purchase_date) where deleted_at is null;

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete restrict,
  description text not null check (length(trim(description)) > 0),
  category_id uuid references public.categories (id) on delete restrict,
  inventory_item_id uuid references public.inventory_items (id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  unit_price numeric(14,6) generated always as (round(total_amount / quantity, 6)) stored,
  add_to_stock boolean not null default false,
  -- Stock units per purchased unit, e.g. 1 rolo = 1000 g.
  stock_qty_per_unit numeric(14,3) not null default 1 check (stock_qty_per_unit > 0),
  -- Set when the purchase is edited: the old lines stay for the stock history.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not add_to_stock or inventory_item_id is not null)
);
create index purchase_items_purchase_idx on public.purchase_items (purchase_id);

alter table public.stock_movements
  add constraint stock_movements_purchase_item_fk
  foreign key (purchase_item_id) references public.purchase_items (id) on delete restrict;

create table public.other_incomes (
  id uuid primary key default gen_random_uuid(),
  income_date date not null,
  description text not null check (length(trim(description)) > 0),
  amount numeric(12,2) not null check (amount > 0),
  notes text,
  deleted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index other_incomes_date_idx on public.other_incomes (income_date) where deleted_at is null;

create trigger set_updated_at before update on public.purchases
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.purchase_items
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.other_incomes
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Inserts the lines of a purchase (and their stock entries); returns the total.
-- p_items: [{ description, category_id, inventory_item_id, quantity,
--             total_amount, add_to_stock, stock_qty_per_unit }]
-- ---------------------------------------------------------------------------
create or replace function private.insert_purchase_items(
  p_purchase_id uuid, p_purchase_date date, p_items jsonb
)
returns numeric
language plpgsql
as $$
declare
  v_item jsonb;
  v_line public.purchase_items;
  v_total numeric := 0;
  v_stock_qty numeric;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe pelo menos um item na compra';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce((v_item ->> 'quantity')::numeric, 0) <= 0 then
      raise exception 'A quantidade deve ser maior que zero';
    end if;
    if (v_item ->> 'total_amount') is null or (v_item ->> 'total_amount')::numeric < 0 then
      raise exception 'O valor total não pode ser negativo';
    end if;

    insert into public.purchase_items (
      purchase_id, description, category_id, inventory_item_id, quantity,
      total_amount, add_to_stock, stock_qty_per_unit
    ) values (
      p_purchase_id,
      coalesce(
        nullif(trim(v_item ->> 'description'), ''),
        (select name from public.inventory_items where id = (v_item ->> 'inventory_item_id')::uuid)
      ),
      (v_item ->> 'category_id')::uuid,
      (v_item ->> 'inventory_item_id')::uuid,
      (v_item ->> 'quantity')::numeric,
      round((v_item ->> 'total_amount')::numeric, 2),
      coalesce((v_item ->> 'add_to_stock')::boolean, false),
      coalesce((v_item ->> 'stock_qty_per_unit')::numeric, 1)
    )
    returning * into v_line;

    if v_line.add_to_stock then
      v_stock_qty = v_line.quantity * v_line.stock_qty_per_unit;
      insert into public.stock_movements (
        inventory_item_id, movement_type, quantity, unit_cost, reason,
        purchase_item_id, occurred_at
      ) values (
        v_line.inventory_item_id, 'IN', v_stock_qty,
        round(v_line.total_amount / v_stock_qty, 6), 'purchase',
        v_line.id, private.movement_ts(p_purchase_date)
      );
    end if;

    v_total = v_total + v_line.total_amount;
  end loop;

  return v_total;
end
$$;

-- p: { purchase_date, supplier_id, notes, items: [...] }
create or replace function public.register_purchase(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform private.assert_member();

  if (p ->> 'purchase_date') is null then
    raise exception 'Informe a data da compra';
  end if;

  insert into public.purchases (purchase_date, supplier_id, notes)
  values ((p ->> 'purchase_date')::date, (p ->> 'supplier_id')::uuid, p ->> 'notes')
  returning id into v_id;

  update public.purchases
     set total_amount = private.insert_purchase_items(v_id, (p ->> 'purchase_date')::date, p -> 'items')
   where id = v_id;

  return v_id;
end
$$;

-- Replaces the lines of a purchase: the old lines' stock entries are reversed
-- and the lines are kept (soft-deleted) so the stock history stays intact.
create or replace function public.update_purchase(p_purchase_id uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_items uuid[];
begin
  perform private.assert_member();

  perform 1 from public.purchases
   where id = p_purchase_id and deleted_at is null
   for update;
  if not found then
    raise exception 'Compra não encontrada';
  end if;
  if (p ->> 'purchase_date') is null then
    raise exception 'Informe a data da compra';
  end if;

  select array_agg(id) into v_old_items
  from public.purchase_items
  where purchase_id = p_purchase_id and deleted_at is null;

  perform private.reverse_movements(p_purchase_item_ids => v_old_items, p_notes => 'Compra editada');
  update public.purchase_items set deleted_at = now() where id = any (v_old_items);

  update public.purchases
     set purchase_date = (p ->> 'purchase_date')::date,
         supplier_id = (p ->> 'supplier_id')::uuid,
         notes = p ->> 'notes',
         total_amount = private.insert_purchase_items(
           p_purchase_id, (p ->> 'purchase_date')::date, p -> 'items'
         )
   where id = p_purchase_id;

  return p_purchase_id;
end
$$;

create or replace function public.delete_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items uuid[];
begin
  perform private.assert_member();

  update public.purchases set deleted_at = now()
   where id = p_purchase_id and deleted_at is null;
  if not found then
    raise exception 'Compra não encontrada';
  end if;

  select array_agg(id) into v_items
  from public.purchase_items
  where purchase_id = p_purchase_id and deleted_at is null;

  perform private.reverse_movements(p_purchase_item_ids => v_items, p_notes => 'Compra excluída');
end
$$;
