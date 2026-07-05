-- Migration: storage bucket for listing images + access policies.

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Anyone can view listing images (public bucket).
drop policy if exists "listing images public read" on storage.objects;
create policy "listing images public read"
  on storage.objects
  for select
  using (bucket_id = 'listing-images');

-- Authenticated users can upload into the bucket.
drop policy if exists "listing images auth upload" on storage.objects;
create policy "listing images auth upload"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'listing-images');

-- Owners can update / delete their own uploaded files.
drop policy if exists "listing images owner update" on storage.objects;
create policy "listing images owner update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'listing-images' and owner = auth.uid());

drop policy if exists "listing images owner delete" on storage.objects;
create policy "listing images owner delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'listing-images' and owner = auth.uid());
