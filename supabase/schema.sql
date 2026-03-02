-- Canonical schema for AV System Design migration off Base44.
-- Apply in Supabase SQL Editor for the target project.

begin;

create extension if not exists pgcrypto;

-- Keep updated_at current on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Normalize email values to lowercase for consistency.
create or replace function public.normalize_email()
returns trigger
language plpgsql
as $$
begin
  if new.email is not null then
    new.email = lower(trim(new.email));
  end if;
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  org_signing_private_key text,
  org_signing_public_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.organizations add column if not exists name text;
alter table if exists public.organizations add column if not exists logo_url text;
alter table if exists public.organizations add column if not exists org_signing_private_key text;
alter table if exists public.organizations add column if not exists org_signing_public_key text;
alter table if exists public.organizations add column if not exists created_at timestamptz default timezone('utc', now());
alter table if exists public.organizations add column if not exists updated_at timestamptz default timezone('utc', now());

create unique index if not exists organizations_name_unique_idx
  on public.organizations (lower(name));

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  status text not null default 'approved',
  organization_id uuid references public.organizations (id) on delete set null,
  organization_role text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.users add column if not exists email text;
alter table if exists public.users add column if not exists full_name text;
alter table if exists public.users add column if not exists status text default 'approved';
alter table if exists public.users add column if not exists organization_id uuid references public.organizations (id) on delete set null;
alter table if exists public.users add column if not exists organization_role text;
alter table if exists public.users add column if not exists created_at timestamptz default timezone('utc', now());
alter table if exists public.users add column if not exists updated_at timestamptz default timezone('utc', now());

create unique index if not exists users_email_unique_idx
  on public.users (lower(email));

create index if not exists users_organization_idx
  on public.users (organization_id);

create table if not exists public.pending_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  organization_role text not null default 'viewer',
  status text not null default 'pending',
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.pending_invites add column if not exists email text;
alter table if exists public.pending_invites add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
alter table if exists public.pending_invites add column if not exists organization_role text default 'viewer';
alter table if exists public.pending_invites add column if not exists status text default 'pending';
alter table if exists public.pending_invites add column if not exists expires_at timestamptz;
alter table if exists public.pending_invites add column if not exists created_at timestamptz default timezone('utc', now());
alter table if exists public.pending_invites add column if not exists updated_at timestamptz default timezone('utc', now());

create index if not exists pending_invites_org_idx
  on public.pending_invites (organization_id);

create index if not exists pending_invites_email_idx
  on public.pending_invites (lower(email));

create table if not exists public.av_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_email text not null,
  shared_with text[] not null default '{}',
  canvas_products jsonb not null default '[]'::jsonb,
  connections jsonb not null default '[]'::jsonb,
  rooms jsonb not null default '[]'::jsonb,
  floorplans jsonb not null default '[]'::jsonb,
  arrows jsonb not null default '[]'::jsonb,
  annotations jsonb not null default '[]'::jsonb,
  updated_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.av_projects add column if not exists name text;
alter table if exists public.av_projects add column if not exists description text default '';
alter table if exists public.av_projects add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
alter table if exists public.av_projects add column if not exists owner_email text;
alter table if exists public.av_projects add column if not exists shared_with text[] default '{}';
alter table if exists public.av_projects add column if not exists canvas_products jsonb default '[]'::jsonb;
alter table if exists public.av_projects add column if not exists connections jsonb default '[]'::jsonb;
alter table if exists public.av_projects add column if not exists rooms jsonb default '[]'::jsonb;
alter table if exists public.av_projects add column if not exists floorplans jsonb default '[]'::jsonb;
alter table if exists public.av_projects add column if not exists arrows jsonb default '[]'::jsonb;
alter table if exists public.av_projects add column if not exists annotations jsonb default '[]'::jsonb;
alter table if exists public.av_projects add column if not exists updated_by text;
alter table if exists public.av_projects add column if not exists created_at timestamptz default timezone('utc', now());
alter table if exists public.av_projects add column if not exists updated_at timestamptz default timezone('utc', now());

create index if not exists av_projects_org_idx
  on public.av_projects (organization_id);

create index if not exists av_projects_owner_email_idx
  on public.av_projects (lower(owner_email));

create index if not exists av_projects_updated_at_idx
  on public.av_projects (updated_at desc);

create table if not exists public.av_products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  brand text not null default '',
  model text not null default '',
  category text not null default '',
  description text default '',
  price numeric,
  image_url text,
  installation_manual_url text,
  user_manual_url text,
  input_connections jsonb not null default '[]'::jsonb,
  output_connections jsonb not null default '[]'::jsonb,
  control jsonb not null default '{}'::jsonb,
  specs jsonb not null default '{}'::jsonb,
  installation_labor numeric,
  configuration_labor numeric,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.av_products add column if not exists organization_id uuid references public.organizations (id) on delete set null;
alter table if exists public.av_products add column if not exists brand text default '';
alter table if exists public.av_products add column if not exists model text default '';
alter table if exists public.av_products add column if not exists category text default '';
alter table if exists public.av_products add column if not exists description text default '';
alter table if exists public.av_products add column if not exists price numeric;
alter table if exists public.av_products add column if not exists image_url text;
alter table if exists public.av_products add column if not exists installation_manual_url text;
alter table if exists public.av_products add column if not exists user_manual_url text;
alter table if exists public.av_products add column if not exists input_connections jsonb default '[]'::jsonb;
alter table if exists public.av_products add column if not exists output_connections jsonb default '[]'::jsonb;
alter table if exists public.av_products add column if not exists control jsonb default '{}'::jsonb;
alter table if exists public.av_products add column if not exists specs jsonb default '{}'::jsonb;
alter table if exists public.av_products add column if not exists installation_labor numeric;
alter table if exists public.av_products add column if not exists configuration_labor numeric;
alter table if exists public.av_products add column if not exists created_at timestamptz default timezone('utc', now());
alter table if exists public.av_products add column if not exists updated_at timestamptz default timezone('utc', now());

create index if not exists av_products_org_idx
  on public.av_products (organization_id);

create index if not exists av_products_category_idx
  on public.av_products (category);

create index if not exists av_products_brand_model_idx
  on public.av_products (lower(brand), lower(model));

create table if not exists public.wire_pricing (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  wire_type text not null default '',
  wire_spec text,
  material_price_per_foot numeric not null default 0,
  labor_price_per_run numeric not null default 0,
  termination_price numeric not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.wire_pricing add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
alter table if exists public.wire_pricing add column if not exists wire_type text default '';
alter table if exists public.wire_pricing add column if not exists wire_spec text;
alter table if exists public.wire_pricing add column if not exists material_price_per_foot numeric default 0;
alter table if exists public.wire_pricing add column if not exists labor_price_per_run numeric default 0;
alter table if exists public.wire_pricing add column if not exists termination_price numeric default 0;
alter table if exists public.wire_pricing add column if not exists created_at timestamptz default timezone('utc', now());
alter table if exists public.wire_pricing add column if not exists updated_at timestamptz default timezone('utc', now());

create index if not exists wire_pricing_org_idx
  on public.wire_pricing (organization_id);

create index if not exists wire_pricing_type_spec_idx
  on public.wire_pricing (wire_type, wire_spec);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'inactive',
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.subscriptions add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
alter table if exists public.subscriptions add column if not exists plan text default 'free';
alter table if exists public.subscriptions add column if not exists status text default 'inactive';
alter table if exists public.subscriptions add column if not exists cancel_at_period_end boolean default false;
alter table if exists public.subscriptions add column if not exists stripe_customer_id text;
alter table if exists public.subscriptions add column if not exists stripe_subscription_id text;
alter table if exists public.subscriptions add column if not exists current_period_start timestamptz;
alter table if exists public.subscriptions add column if not exists current_period_end timestamptz;
alter table if exists public.subscriptions add column if not exists created_at timestamptz default timezone('utc', now());
alter table if exists public.subscriptions add column if not exists updated_at timestamptz default timezone('utc', now());

create unique index if not exists subscriptions_org_unique_idx
  on public.subscriptions (organization_id);

create unique index if not exists subscriptions_stripe_subscription_unique_idx
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Trigger wiring
drop trigger if exists set_updated_at_organizations on public.organizations;
create trigger set_updated_at_organizations
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_users on public.users;
create trigger set_updated_at_users
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists normalize_email_users on public.users;
create trigger normalize_email_users
before insert or update on public.users
for each row execute function public.normalize_email();

drop trigger if exists set_updated_at_pending_invites on public.pending_invites;
create trigger set_updated_at_pending_invites
before update on public.pending_invites
for each row execute function public.set_updated_at();

drop trigger if exists normalize_email_pending_invites on public.pending_invites;
create trigger normalize_email_pending_invites
before insert or update on public.pending_invites
for each row execute function public.normalize_email();

drop trigger if exists set_updated_at_av_projects on public.av_projects;
create trigger set_updated_at_av_projects
before update on public.av_projects
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_subscriptions on public.subscriptions;
create trigger set_updated_at_subscriptions
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_av_products on public.av_products;
create trigger set_updated_at_av_products
before update on public.av_products
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_wire_pricing on public.wire_pricing;
create trigger set_updated_at_wire_pricing
before update on public.wire_pricing
for each row execute function public.set_updated_at();

commit;
