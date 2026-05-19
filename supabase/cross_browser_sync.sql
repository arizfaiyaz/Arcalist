create table if not exists public.arcalist_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  state jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by_device_id text
);

alter table public.arcalist_workspaces
  add column if not exists version integer not null default 1,
  add column if not exists updated_by_device_id text;

alter table public.arcalist_workspaces enable row level security;

drop policy if exists "Users can select their own workspace" on public.arcalist_workspaces;
create policy "Users can select their own workspace"
on public.arcalist_workspaces for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workspace" on public.arcalist_workspaces;
drop policy if exists "Active Pro users can insert their own workspace" on public.arcalist_workspaces;
create policy "Active Pro users can insert their own workspace"
on public.arcalist_workspaces for insert
to authenticated
with check (auth.uid() = user_id and public.is_active_pro(auth.uid()));

drop policy if exists "Users can update their own workspace" on public.arcalist_workspaces;
drop policy if exists "Active Pro users can update their own workspace" on public.arcalist_workspaces;
create policy "Active Pro users can update their own workspace"
on public.arcalist_workspaces for update
to authenticated
using (auth.uid() = user_id and public.is_active_pro(auth.uid()))
with check (auth.uid() = user_id and public.is_active_pro(auth.uid()));

drop policy if exists "Users can delete their own workspace" on public.arcalist_workspaces;
create policy "Users can delete their own workspace"
on public.arcalist_workspaces for delete
to authenticated
using (auth.uid() = user_id);

create table if not exists public.sync_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  browser text,
  device_name text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id, device_id)
);

alter table public.sync_devices enable row level security;

drop policy if exists "Users can select their own sync devices" on public.sync_devices;
create policy "Users can select their own sync devices"
on public.sync_devices for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own sync devices" on public.sync_devices;
drop policy if exists "Active Pro users can insert their own sync devices" on public.sync_devices;
create policy "Active Pro users can insert their own sync devices"
on public.sync_devices for insert
to authenticated
with check (auth.uid() = user_id and public.is_active_pro(auth.uid()));

drop policy if exists "Users can update their own sync devices" on public.sync_devices;
drop policy if exists "Active Pro users can update their own sync devices" on public.sync_devices;
create policy "Active Pro users can update their own sync devices"
on public.sync_devices for update
to authenticated
using (auth.uid() = user_id and public.is_active_pro(auth.uid()))
with check (auth.uid() = user_id and public.is_active_pro(auth.uid()));

drop policy if exists "Users can delete their own sync devices" on public.sync_devices;
create policy "Users can delete their own sync devices"
on public.sync_devices for delete
to authenticated
using (auth.uid() = user_id);
