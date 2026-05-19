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

create or replace function public.is_active_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_entitlements ue
    where ue.user_id = p_user_id
      and ue.plan = 'pro'
      and ue.status = 'active'
  );
$$;

revoke all on function public.is_active_pro(uuid) from public;
grant execute on function public.is_active_pro(uuid) to authenticated;

alter table public.shared_pages enable row level security;

drop policy if exists "Owners can select their shared pages" on public.shared_pages;
create policy "Owners can select their shared pages"
on public.shared_pages for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Anyone can read active shared pages" on public.shared_pages;
drop policy if exists "Owners can insert their shared pages" on public.shared_pages;
drop policy if exists "Active Pro owners can insert shared pages" on public.shared_pages;
create policy "Active Pro owners can insert shared pages"
on public.shared_pages for insert
to authenticated
with check (auth.uid() = owner_id and public.is_active_pro(auth.uid()));

drop policy if exists "Owners can update their shared pages" on public.shared_pages;
drop policy if exists "Active Pro owners can update shared pages" on public.shared_pages;
create policy "Active Pro owners can update shared pages"
on public.shared_pages for update
to authenticated
using (auth.uid() = owner_id and public.is_active_pro(auth.uid()))
with check (auth.uid() = owner_id and public.is_active_pro(auth.uid()));

drop policy if exists "Owners can delete their shared pages" on public.shared_pages;
create policy "Owners can delete their shared pages"
on public.shared_pages for delete
to authenticated
using (auth.uid() = owner_id);

create or replace function public.get_shared_page_by_token(p_token text)
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
  where share_token = p_token
    and is_active = true;

  return query
  select
    sp.title,
    sp.snapshot,
    sp.view_count,
    sp.updated_at,
    sp.last_viewed_at
  from public.shared_pages sp
  where sp.share_token = p_token
    and sp.is_active = true
  limit 1;
end;
$$;

revoke all on function public.get_shared_page_by_token(text) from public;
grant execute on function public.get_shared_page_by_token(text) to anon, authenticated;

create or replace function public.revoke_shared_page(p_share_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.shared_pages sp
  set
    is_active = false,
    updated_at = now()
  where sp.id = p_share_id
    and sp.owner_id = auth.uid();

  return found;
end;
$$;

revoke all on function public.revoke_shared_page(uuid) from public;
grant execute on function public.revoke_shared_page(uuid) to authenticated;
