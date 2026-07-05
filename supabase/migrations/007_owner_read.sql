-- Migration: owners can read their own listings (including inactive) for /mes-annonces + edit.

drop policy if exists "owners read own listings" on public.listings;
create policy "owners read own listings"
  on public.listings
  for select
  to authenticated
  using (auth.uid() = owner_id);
