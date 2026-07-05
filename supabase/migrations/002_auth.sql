-- Migration: add listing ownership + auth-based write policies.
-- Safe to run on an existing database (idempotent).

alter table public.listings
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

-- Authenticated users can create listings they own, and manage their own.
drop policy if exists "owners insert" on public.listings;
create policy "owners insert"
  on public.listings
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "owners update own" on public.listings;
create policy "owners update own"
  on public.listings
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "owners delete own" on public.listings;
create policy "owners delete own"
  on public.listings
  for delete
  to authenticated
  using (auth.uid() = owner_id);
