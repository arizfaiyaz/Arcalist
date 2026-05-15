create table if not exists public.productivity_analytics (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  domain text not null,
  total_ms integer not null default 0,
  favicon_url text,
  category text,
  updated_at timestamptz not null default now(),
  primary key (user_id, date, domain)
);

-- Security TODO before payment launch:
-- Productivity analytics is a Pro feature. Enforce Pro server-side for
-- insert/update using trusted entitlement data such as auth.jwt() app_metadata
-- or an Edge Function after the billing provider is integrated.

alter table public.productivity_analytics enable row level security;

drop policy if exists "Users can select their own analytics" on public.productivity_analytics;
create policy "Users can select their own analytics"
on public.productivity_analytics for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own analytics" on public.productivity_analytics;
create policy "Users can insert their own analytics"
on public.productivity_analytics for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own analytics" on public.productivity_analytics;
create policy "Users can update their own analytics"
on public.productivity_analytics for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own analytics" on public.productivity_analytics;
create policy "Users can delete their own analytics"
on public.productivity_analytics for delete
to authenticated
using (auth.uid() = user_id);
