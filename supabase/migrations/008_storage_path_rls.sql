-- Restrict listing-images uploads to paths under {auth.uid()}/...

drop policy if exists "listing images auth upload" on storage.objects;
create policy "listing images auth upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing images owner update" on storage.objects;
create policy "listing images owner update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "listing images owner delete" on storage.objects;
create policy "listing images owner delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
