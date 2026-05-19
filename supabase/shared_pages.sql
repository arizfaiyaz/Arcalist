create table if not exists public.shared_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  page_id text not null,
  share_token text not null unique,
  title text not null,
  snapshot jsonb not null,
  is_active boolean not null default true,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_viewed_at timestamptz
);

-- Security TODO before payment launch:
-- Page sharing is a Pro feature. Enforce Pro server-side for insert/update
-- using trusted entitlement data such as auth.jwt() app_metadata or an Edge
-- Function after the billing provider is integrated.

alter table public.shared_pages enable row level security;

drop policy if exists "Owners can select their shared pages" on public.shared_pages;
create policy "Owners can select their shared pages"
on public.shared_pages for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Anyone can read active shared pages" on public.shared_pages;
create policy "Anyone can read active shared pages"
on public.shared_pages for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Owners can insert their shared pages" on public.shared_pages;
create policy "Owners can insert their shared pages"
on public.shared_pages for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Owners can update their shared pages" on public.shared_pages;
create policy "Owners can update their shared pages"
on public.shared_pages for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete their shared pages" on public.shared_pages;
create policy "Owners can delete their shared pages"
on public.shared_pages for delete
to authenticated
using (auth.uid() = owner_id);

create or replace function public.get_shared_page_by_token(p_share_token text)
returns table (
  title text,
  snapshot jsonb,
  view_count integer,
  updated_at timestamptz,
  last_viewed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shared_pages
  set
    view_count = view_count + 1,
    last_viewed_at = now()
  where share_token = p_share_token
    and is_active = true;

  return query
  select
    sp.title,
    sp.snapshot,
    sp.view_count,
    sp.updated_at,
    sp.last_viewed_at
  from public.shared_pages sp
  where sp.share_token = p_share_token
    and sp.is_active = true
  limit 1;
end;
$$;

revoke all on function public.get_shared_page_by_token(text) from public;
grant execute on function public.get_shared_page_by_token(text) to anon, authenticated;
