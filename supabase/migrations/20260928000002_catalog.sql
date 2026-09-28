-- Catalog: inventory items (materials), products, variants and cost sheets.

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  category_id uuid references public.categories (id) on delete restrict,
  unit_id uuid not null references public.units (id) on delete restrict,
  -- Cached from stock_movements; only the movement trigger may change these.
  current_qty numeric(14,3) not null default 0,
  avg_cost numeric(14,6) not null default 0 check (avg_cost >= 0),
  min_qty numeric(14,3) not null default 0 check (min_qty >= 0),
  supplier_id uuid references public.suppliers (id) on delete set null,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index inventory_items_name_key on public.inventory_items (lower(name));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  sku text not null check (length(trim(sku)) > 0),
  description text,
  category_id uuid references public.categories (id) on delete restrict,
  is_active boolean not null default true,
  is_customizable boolean not null default false,
  default_price numeric(12,2) not null default 0 check (default_price >= 0),
  -- Manual fallback used when there is no cost sheet and no variant override.
  estimated_cost numeric(14,6) not null default 0 check (estimated_cost >= 0),
  -- made_to_order: a sale consumes materials (if auto_deduct_materials).
  -- stocked: production consumes materials; a sale consumes finished units.
  stock_mode text not null default 'made_to_order'
    check (stock_mode in ('made_to_order', 'stocked')),
  auto_deduct_materials boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index products_sku_key on public.products (lower(sku));

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  sku text not null check (length(trim(sku)) > 0),
  -- null = use products.default_price
  price numeric(12,2) check (price >= 0),
  -- null = use the cost sheet, or products.estimated_cost
  cost_override numeric(14,6) check (cost_override >= 0),
  min_stock numeric(14,3) not null default 0 check (min_stock >= 0),
  -- Finished-goods stock, cached from stock_movements.
  current_qty numeric(14,3) not null default 0,
  avg_cost numeric(14,6) not null default 0 check (avg_cost >= 0),
  -- The hidden "Padrão" variant of a product without variations.
  is_default boolean not null default false,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, product_id)
);
create unique index product_variants_sku_key on public.product_variants (lower(sku));
create unique index product_variants_one_default
  on public.product_variants (product_id) where is_default;
create index product_variants_product_idx on public.product_variants (product_id);

create table public.product_variant_values (
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  variation_type_id uuid not null,
  variation_value_id uuid not null,
  primary key (variant_id, variation_value_id),
  -- one value per variation type (e.g. a single Cor) on each variant
  unique (variant_id, variation_type_id),
  foreign key (variation_value_id, variation_type_id)
    references public.variation_values (id, variation_type_id) on delete restrict
);

-- Cost sheet (bill of materials). Rows with variant_id replace the product-level
-- sheet for that variant; rows without it apply to every other variant.
create table public.product_materials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid,
  inventory_item_id uuid not null references public.inventory_items (id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (variant_id, product_id)
    references public.product_variants (id, product_id) on delete cascade,
  unique nulls not distinct (product_id, variant_id, inventory_item_id)
);

create table public.product_extra_costs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  amount numeric(14,6) not null check (amount >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.inventory_items
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.product_variants
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.product_materials
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.product_extra_costs
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Current unit cost of each variant:
--   cost_override → cost sheet (materials at current avg cost + extra costs)
--   → products.estimated_cost
-- ---------------------------------------------------------------------------
create view public.variant_costs
with (security_invoker = true)
as
with sheet_rows as (
  select v.id as variant_id, pm.quantity, ii.avg_cost
  from public.product_variants v
  join public.product_materials pm
    on pm.product_id = v.product_id
   and (
     pm.variant_id = v.id
     or (
       pm.variant_id is null
       and not exists (
         select 1 from public.product_materials own where own.variant_id = v.id
       )
     )
   )
  join public.inventory_items ii on ii.id = pm.inventory_item_id
),
materials as (
  select variant_id, sum(quantity * avg_cost) as material_cost
  from sheet_rows
  group by variant_id
),
extras as (
  select product_id, sum(amount) as extra_cost
  from public.product_extra_costs
  group by product_id
)
select
  v.id as variant_id,
  v.product_id,
  coalesce(m.material_cost, 0)::numeric(14,6) as material_cost,
  coalesce(e.extra_cost, 0)::numeric(14,6) as extra_cost,
  (case
    when v.cost_override is not null then v.cost_override
    when m.variant_id is not null or e.product_id is not null
      then coalesce(m.material_cost, 0) + coalesce(e.extra_cost, 0)
    else p.estimated_cost
  end)::numeric(14,6) as unit_cost,
  case
    when v.cost_override is not null then 'override'
    when m.variant_id is not null or e.product_id is not null then 'sheet'
    else 'estimate'
  end as cost_source
from public.product_variants v
join public.products p on p.id = v.product_id
left join materials m on m.variant_id = v.id
left join extras e on e.product_id = v.product_id;
