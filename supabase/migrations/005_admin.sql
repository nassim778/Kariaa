-- Migration: profiles + admin flag (is_admin = 1) and admin RLS policies.

-- Profiles linked to auth.users ---------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  is_admin   smallint not null default 0 check (is_admin in (0, 1)),
  created_at timestamptz not null default now()
);

create index if not exists profiles_is_admin_idx on public.profiles (is_admin);

-- Helper: is the current user an admin? (security definer avoids RLS recursion)
create or replace function public.user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = 1
  );
$$;

-- Auto-create profile on sign-up --------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, 0)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for existing auth users ---------------------------------
insert into public.profiles (id, email, is_admin)
select id, email, 0 from auth.users
on conflict (id) do nothing;

-- Profiles RLS --------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.user_is_admin());

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles"
  on public.profiles for update to authenticated
  using (public.user_is_admin())
  with check (public.user_is_admin());

-- Listings: admin can manage everything -------------------------------------
drop policy if exists "admin read all listings" on public.listings;
create policy "admin read all listings"
  on public.listings for select to authenticated
  using (public.user_is_admin());

drop policy if exists "admin update any listing" on public.listings;
create policy "admin update any listing"
  on public.listings for update to authenticated
  using (public.user_is_admin())
  with check (public.user_is_admin());

drop policy if exists "admin delete any listing" on public.listings;
create policy "admin delete any listing"
  on public.listings for delete to authenticated
  using (public.user_is_admin());

-- To promote your first admin (run once in SQL editor, replace the email):
-- update public.profiles set is_admin = 1
-- where email = 'your-admin@email.com';
