-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_number text not null default '',
  filename text,
  fields jsonb not null default '{}'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  -- New columns for Toteat processing pipeline
  processing_status text not null default 'pending',  -- pending, processed, registered, failed, partial
  toteat_registered boolean not null default false,
  toteat_response jsonb,
  toteat_registered_at timestamptz,
  provider_vat text,
  net_amount numeric,
  tax_amount numeric,
  total_amount numeric,
  currency text,
  processed_line_items jsonb not null default '[]'::jsonb,
  -- Supplier matching
  matched_supplier_id uuid references public.suppliers (id) on delete set null,
  supplier_candidates jsonb not null default '[]'::jsonb,  -- partial matches for user selection
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure existing installs get the new columns when the invoices table already exists.
alter table public.invoices
  add column if not exists processing_status text not null default 'pending',
  add column if not exists toteat_registered boolean not null default false,
  add column if not exists toteat_response jsonb,
  add column if not exists toteat_registered_at timestamptz,
  add column if not exists provider_vat text,
  add column if not exists net_amount numeric,
  add column if not exists tax_amount numeric,
  add column if not exists total_amount numeric,
  add column if not exists currency text,
  add column if not exists processed_line_items jsonb not null default '[]'::jsonb,
  add column if not exists matched_supplier_id uuid references public.suppliers (id) on delete set null,
  add column if not exists supplier_candidates jsonb not null default '[]'::jsonb;

create index if not exists invoices_user_id_idx on public.invoices (user_id);
create index if not exists invoices_user_number_idx on public.invoices (user_id, invoice_number);
create index if not exists invoices_processing_status_idx on public.invoices (processing_status);

alter table public.invoices enable row level security;

drop policy if exists "Users manage own invoices" on public.invoices;
create policy "Users manage own invoices"
  on public.invoices
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at
  before update on public.invoices
  for each row
  execute function public.set_updated_at();

-- profiles table to store public user registration info
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view and manage their own profiles" on public.profiles;
create policy "Users can view and manage their own profiles"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Function and trigger to automatically insert a new user profile on sign up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();


-- ============================================================
-- Invoice Alerts — tracks processing failures and warnings
-- ============================================================
create table if not exists public.invoice_alerts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_type text not null,             -- 'product_not_found', 'conversion_error', 'total_mismatch', 'api_error'
  severity text not null default 'error',  -- 'warning', 'error', 'info'
  title text not null,
  description text not null,
  line_item_index integer,              -- which line item triggered this alert
  product_name text,
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists invoice_alerts_invoice_id_idx on public.invoice_alerts (invoice_id);
create index if not exists invoice_alerts_user_id_idx on public.invoice_alerts (user_id);
create index if not exists invoice_alerts_resolved_idx on public.invoice_alerts (resolved);

alter table public.invoice_alerts enable row level security;

drop policy if exists "Users manage own alerts" on public.invoice_alerts;
create policy "Users manage own alerts"
  on public.invoice_alerts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- Invoice Review Comments — structured audit trail
-- ============================================================
create table if not exists public.invoice_review_comments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment_type text not null,          -- 'review_required', 'conversion_applied', 'catalog_match', 'manual_override'
  invoice_number text,
  product_name text,
  issue text not null,
  action_taken text,
  next_step text,
  created_at timestamptz not null default now()
);

create index if not exists review_comments_invoice_id_idx on public.invoice_review_comments (invoice_id);
create index if not exists review_comments_user_id_idx on public.invoice_review_comments (user_id);

alter table public.invoice_review_comments enable row level security;

drop policy if exists "Users manage own review comments" on public.invoice_review_comments;
create policy "Users manage own review comments"
  on public.invoice_review_comments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
-- Suppliers — vendor/supplier master list
-- ============================================================
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier_code text not null,          -- e.g. 'SUP001', unique per user
  supplier_name text not null,          -- canonical name from database
  supplier_vat text,                    -- NIT/RUT/VAT number
  supplier_address text,
  supplier_email text,
  supplier_phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, supplier_code),
  unique(user_id, supplier_name)
);

create index if not exists suppliers_user_id_idx on public.suppliers (user_id);
create index if not exists suppliers_code_idx on public.suppliers (supplier_code);

create extension if not exists pg_trgm;
create index if not exists suppliers_name_idx on public.suppliers using gin (supplier_name gin_trgm_ops);

alter table public.suppliers enable row level security;

drop policy if exists "Users manage own suppliers" on public.suppliers;
create policy "Users manage own suppliers"
  on public.suppliers
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at
  before update on public.suppliers
  for each row
  execute function public.set_updated_at();


-- ============================================================
-- Supplier-Product Association — links suppliers to their products
-- ============================================================
create table if not exists public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_code text not null,           -- Reference to product_catalog.product_code
  product_name text not null,           -- Cached product name for quick access
  supplier_product_code text,           -- Supplier's internal code for this product
  created_at timestamptz not null default now(),
  unique(supplier_id, product_code)
);

create index if not exists supplier_products_supplier_id_idx on public.supplier_products (supplier_id);
create index if not exists supplier_products_product_code_idx on public.supplier_products (product_code);

alter table public.supplier_products enable row level security;

drop policy if exists "Users can view supplier products" on public.supplier_products;
create policy "Users can view supplier products"
  on public.supplier_products
  for select
  using (
    supplier_id in (
      select id from public.suppliers where user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage supplier products" on public.supplier_products;
create policy "Users can manage supplier products"
  on public.supplier_products
  for all
  using (
    supplier_id in (
      select id from public.suppliers where user_id = auth.uid()
    )
  );


-- ============================================================
-- Product Catalog — loaded from Toteat ingredient master CSV
-- ============================================================
create table if not exists public.product_catalog (
  id uuid primary key default gen_random_uuid(),
  product_code text unique not null,   -- e.g. 'PRO007'
  product_name text not null,
  cost numeric not null default 0,
  active boolean not null default true,
  base_unit text not null,             -- 'UN', 'kg', 'L'
  created_at timestamptz not null default now()
);

create index if not exists product_catalog_code_idx on public.product_catalog (product_code);

-- Ensure trigram operator class is available for text search indexes.
create extension if not exists pg_trgm;

create index if not exists product_catalog_name_idx on public.product_catalog using gin (product_name gin_trgm_ops);

alter table public.product_catalog enable row level security;

-- Product catalog is readable by all authenticated users
drop policy if exists "Authenticated users can read product catalog" on public.product_catalog;
create policy "Authenticated users can read product catalog"
  on public.product_catalog
  for select
  using (auth.role() = 'authenticated');

-- Only service role can insert/update/delete catalog entries
drop policy if exists "Service role manages product catalog" on public.product_catalog;
create policy "Service role manages product catalog"
  on public.product_catalog
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


-- ============================================================
-- Toteat Settings — per-user API credentials (setup page)
-- ============================================================
create table if not exists public.toteat_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  api_url text not null default '',
  xir text not null default '',         -- Restaurant identifier
  xil text not null default '',         -- Local identifier
  xiu text not null default '',         -- User identifier
  xapitoken text not null default '',   -- API auth token
  default_provider_vat text,            -- Default supplier NIT/RUT
  default_invoice_type text not null default 'FACTURA',
  default_currency text not null default 'COP',
  default_tax_name text not null default 'IVA',
  default_tax_rate numeric not null default 0.19,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.toteat_settings enable row level security;

drop policy if exists "Users manage own toteat settings" on public.toteat_settings;
create policy "Users manage own toteat settings"
  on public.toteat_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists toteat_settings_updated_at on public.toteat_settings;
create trigger toteat_settings_updated_at
  before update on public.toteat_settings
  for each row
  execute function public.set_updated_at();
