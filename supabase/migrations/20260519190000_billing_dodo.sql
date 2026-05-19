create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  dodo_customer_id text unique,
  email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dodo_subscription_id text not null unique,
  dodo_customer_id text,
  dodo_product_id text,
  plan text not null default 'pro' check (plan in ('pro')),
  plan_code text check (plan_code in ('pro_monthly', 'pro_yearly')),
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx
on public.subscriptions (user_id);

create index if not exists subscriptions_dodo_customer_id_idx
on public.subscriptions (dodo_customer_id);

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  is_pro boolean not null default false,
  source text not null default 'default_free',
  dodo_subscription_id text,
  valid_until timestamptz,
  status text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  event_id text primary key,
  provider text not null default 'dodo',
  event_type text not null,
  payload jsonb not null,
  status text not null default 'processing',
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.webhook_events
  add column if not exists provider text not null default 'dodo';

alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists "Users can select their own billing customer" on public.billing_customers;
create policy "Users can select their own billing customer"
on public.billing_customers for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can select their own subscriptions" on public.subscriptions;
create policy "Users can select their own subscriptions"
on public.subscriptions for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can select their own entitlement" on public.user_entitlements;
create policy "Users can select their own entitlement"
on public.user_entitlements for select
to authenticated
using (auth.uid() = user_id);

revoke insert, update, delete on public.billing_customers from authenticated, anon;
revoke insert, update, delete on public.subscriptions from authenticated, anon;
revoke insert, update, delete on public.user_entitlements from authenticated, anon;
revoke all on public.webhook_events from authenticated, anon;
