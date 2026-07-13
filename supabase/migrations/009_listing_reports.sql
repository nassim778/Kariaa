-- User reports for listings (UGC moderation).

create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);

alter table public.listing_reports enable row level security;

drop policy if exists "users insert own reports" on public.listing_reports;
create policy "users insert own reports"
  on public.listing_reports
  for insert
  to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "users read own reports" on public.listing_reports;
create policy "users read own reports"
  on public.listing_reports
  for select
  to authenticated
  using (reporter_id = auth.uid() or public.user_is_admin());

drop policy if exists "admins read all reports" on public.listing_reports;
create policy "admins read all reports"
  on public.listing_reports
  for select
  to authenticated
  using (public.user_is_admin());
