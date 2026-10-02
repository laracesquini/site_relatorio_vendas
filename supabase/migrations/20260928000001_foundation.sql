-- Foundation: private helpers, membership and lookup tables.
--
-- Conventions
--   money       numeric(12,2)
--   unit costs  numeric(14,6)   (e.g. R$ 0,113900 per gram)
--   quantities  numeric(14,3)
--   Ledger tables (stock, purchases, sales) are read-only for clients and are
--   written exclusively through SECURITY DEFINER RPCs, one transaction each.

create schema if not exists private;
alter default privileges in schema private revoke execute on functions from public;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

-- Business dates are local to Brazil, not to the database server (UTC).
create or replace function private.today()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- Timestamp for a stock movement dated p_date: now() for today, otherwise noon
-- local time, so the movement never shows up on the neighbouring day.
create or replace function private.movement_ts(p_date date)
returns timestamptz
language sql
stable
as $$
  select case
    when p_date is null or p_date = private.today() then now()
    else (p_date::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo'
  end
$$;

-- ---------------------------------------------------------------------------
-- Membership: only users listed here can read or write business data.
-- The first user created in Supabase Auth becomes a member automatically;
-- later sign-ups get no access unless added manually.
-- ---------------------------------------------------------------------------
create table public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function private.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.members where user_id = auth.uid())
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_member() to authenticated;

create or replace function private.assert_member()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.is_member() then
    raise exception 'Acesso negado' using errcode = '42501';
  end if;
end
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.members) then
    insert into public.members (user_id) values (new.id);
  end if;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- A user created before this migration ran becomes the owner.
insert into public.members (user_id)
select id from auth.users order by created_at limit 1
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Lookups
-- ---------------------------------------------------------------------------
create table public.units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(trim(code)) > 0),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  kind text not null check (kind in ('product', 'material', 'expense')),
  -- Operational expenses (ads, taxes, tools…) are subtracted in "Resultado do período".
  is_operational boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_kind_name_key on public.categories (kind, lower(name));

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  contact text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index suppliers_name_key on public.suppliers (lower(name));

create table public.sales_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  is_active boolean not null default true,
  -- Reserved for future marketplace fee rules (percent, fixed fee, shipping…).
  fee_rules jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index sales_channels_name_key on public.sales_channels (lower(name));

create table public.variation_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index variation_types_name_key on public.variation_types (lower(name));

create table public.variation_values (
  id uuid primary key default gen_random_uuid(),
  variation_type_id uuid not null references public.variation_types (id) on delete restrict,
  value text not null check (length(trim(value)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Target for the composite FK that keeps one value per type on a variant.
  unique (id, variation_type_id)
);
create unique index variation_values_type_value_key
  on public.variation_values (variation_type_id, lower(value));

create trigger set_updated_at before update on public.units
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.categories
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.suppliers
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.sales_channels
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.variation_types
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.variation_values
  for each row execute function private.set_updated_at();
