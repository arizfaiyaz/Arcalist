insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'custom-wallpapers',
  'custom-wallpapers',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Users can read their own custom wallpapers" on storage.objects;
create policy "Users can read their own custom wallpapers"
on storage.objects for select
to authenticated
using (
  bucket_id = 'custom-wallpapers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload their own custom wallpapers" on storage.objects;
drop policy if exists "Active Pro users can upload their own custom wallpapers" on storage.objects;
create policy "Active Pro users can upload their own custom wallpapers"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'custom-wallpapers'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_active_pro(auth.uid())
);

drop policy if exists "Users can update their own custom wallpapers" on storage.objects;
drop policy if exists "Active Pro users can update their own custom wallpapers" on storage.objects;
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

drop policy if exists "Users can delete their own custom wallpapers" on storage.objects;
create policy "Users can delete their own custom wallpapers"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'custom-wallpapers'
  and (storage.foldername(name))[1] = auth.uid()::text
);
