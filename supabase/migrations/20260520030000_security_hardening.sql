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
  update public.shared_pages sp
  set
    view_count = sp.view_count + 1,
    last_viewed_at = now()
  where sp.share_token = p_token
    and sp.is_active = true;

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

do $$
begin
  if to_regclass('public.shared_pages') is not null then
    alter table public.shared_pages enable row level security;

    drop policy if exists "Anyone can read active shared pages" on public.shared_pages;
    drop policy if exists "Owners can select their shared pages" on public.shared_pages;
    drop policy if exists "Owners can insert their shared pages" on public.shared_pages;
    drop policy if exists "Owners can update their shared pages" on public.shared_pages;
    drop policy if exists "Owners can delete their shared pages" on public.shared_pages;
    drop policy if exists "Active Pro owners can insert shared pages" on public.shared_pages;
    drop policy if exists "Active Pro owners can update shared pages" on public.shared_pages;

    create policy "Owners can select their shared pages"
    on public.shared_pages for select
    to authenticated
    using (auth.uid() = owner_id);

    create policy "Active Pro owners can insert shared pages"
    on public.shared_pages for insert
    to authenticated
    with check (auth.uid() = owner_id and public.is_active_pro(auth.uid()));

    create policy "Active Pro owners can update shared pages"
    on public.shared_pages for update
    to authenticated
    using (auth.uid() = owner_id and public.is_active_pro(auth.uid()))
    with check (auth.uid() = owner_id and public.is_active_pro(auth.uid()));

    create policy "Owners can delete their shared pages"
    on public.shared_pages for delete
    to authenticated
    using (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.arcalist_workspaces') is not null then
    alter table public.arcalist_workspaces enable row level security;

    drop policy if exists "Users can select their own workspace" on public.arcalist_workspaces;
    drop policy if exists "Users can insert their own workspace" on public.arcalist_workspaces;
    drop policy if exists "Users can update their own workspace" on public.arcalist_workspaces;
    drop policy if exists "Users can delete their own workspace" on public.arcalist_workspaces;
    drop policy if exists "Active Pro users can insert their own workspace" on public.arcalist_workspaces;
    drop policy if exists "Active Pro users can update their own workspace" on public.arcalist_workspaces;

    create policy "Users can select their own workspace"
    on public.arcalist_workspaces for select
    to authenticated
    using (auth.uid() = user_id);

    create policy "Active Pro users can insert their own workspace"
    on public.arcalist_workspaces for insert
    to authenticated
    with check (auth.uid() = user_id and public.is_active_pro(auth.uid()));

    create policy "Active Pro users can update their own workspace"
    on public.arcalist_workspaces for update
    to authenticated
    using (auth.uid() = user_id and public.is_active_pro(auth.uid()))
    with check (auth.uid() = user_id and public.is_active_pro(auth.uid()));

    create policy "Users can delete their own workspace"
    on public.arcalist_workspaces for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.sync_devices') is not null then
    alter table public.sync_devices enable row level security;

    drop policy if exists "Users can select their own sync devices" on public.sync_devices;
    drop policy if exists "Users can insert their own sync devices" on public.sync_devices;
    drop policy if exists "Users can update their own sync devices" on public.sync_devices;
    drop policy if exists "Users can delete their own sync devices" on public.sync_devices;
    drop policy if exists "Active Pro users can insert their own sync devices" on public.sync_devices;
    drop policy if exists "Active Pro users can update their own sync devices" on public.sync_devices;

    create policy "Users can select their own sync devices"
    on public.sync_devices for select
    to authenticated
    using (auth.uid() = user_id);

    create policy "Active Pro users can insert their own sync devices"
    on public.sync_devices for insert
    to authenticated
    with check (auth.uid() = user_id and public.is_active_pro(auth.uid()));

    create policy "Active Pro users can update their own sync devices"
    on public.sync_devices for update
    to authenticated
    using (auth.uid() = user_id and public.is_active_pro(auth.uid()))
    with check (auth.uid() = user_id and public.is_active_pro(auth.uid()));

    create policy "Users can delete their own sync devices"
    on public.sync_devices for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('public.productivity_analytics') is not null then
    alter table public.productivity_analytics enable row level security;

    drop policy if exists "Users can select their own analytics" on public.productivity_analytics;
    drop policy if exists "Users can insert their own analytics" on public.productivity_analytics;
    drop policy if exists "Users can update their own analytics" on public.productivity_analytics;
    drop policy if exists "Users can delete their own analytics" on public.productivity_analytics;
    drop policy if exists "Active Pro users can insert their own analytics" on public.productivity_analytics;
    drop policy if exists "Active Pro users can update their own analytics" on public.productivity_analytics;

    create policy "Users can select their own analytics"
    on public.productivity_analytics for select
    to authenticated
    using (auth.uid() = user_id);

    create policy "Active Pro users can insert their own analytics"
    on public.productivity_analytics for insert
    to authenticated
    with check (auth.uid() = user_id and public.is_active_pro(auth.uid()));

    create policy "Active Pro users can update their own analytics"
    on public.productivity_analytics for update
    to authenticated
    using (auth.uid() = user_id and public.is_active_pro(auth.uid()))
    with check (auth.uid() = user_id and public.is_active_pro(auth.uid()));

    create policy "Users can delete their own analytics"
    on public.productivity_analytics for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if to_regclass('storage.objects') is not null
    and exists (select 1 from storage.buckets where id = 'custom-wallpapers') then
    drop policy if exists "Users can read their own custom wallpapers" on storage.objects;
    drop policy if exists "Users can upload their own custom wallpapers" on storage.objects;
    drop policy if exists "Users can update their own custom wallpapers" on storage.objects;
    drop policy if exists "Users can delete their own custom wallpapers" on storage.objects;
    drop policy if exists "Active Pro users can upload their own custom wallpapers" on storage.objects;
    drop policy if exists "Active Pro users can update their own custom wallpapers" on storage.objects;

    create policy "Users can read their own custom wallpapers"
    on storage.objects for select
    to authenticated
    using (
      bucket_id = 'custom-wallpapers'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

    create policy "Active Pro users can upload their own custom wallpapers"
    on storage.objects for insert
    to authenticated
    with check (
      bucket_id = 'custom-wallpapers'
      and (storage.foldername(name))[1] = auth.uid()::text
      and public.is_active_pro(auth.uid())
    );

    create policy "Active Pro users can update their own custom wallpapers"
    on storage.objects for update
    to authenticated
    using (
      bucket_id = 'custom-wallpapers'
      and (storage.foldername(name))[1] = auth.uid()::text
      and public.is_active_pro(auth.uid())
    )
    with check (
      bucket_id = 'custom-wallpapers'
      and (storage.foldername(name))[1] = auth.uid()::text
      and public.is_active_pro(auth.uid())
    );

    create policy "Users can delete their own custom wallpapers"
    on storage.objects for delete
    to authenticated
    using (
      bucket_id = 'custom-wallpapers'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;
end $$;
