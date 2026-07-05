-- ============================================================================
-- Karia — Supabase / PostGIS schema
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (or `supabase db push`) to provision the
-- database. It creates the listings table, geospatial indexes, and two RPC
-- functions used by the map:
--   * listings_in_bbox     -> "search as I move the map" (viewport query)
--   * listings_in_radius   -> "everything within X km of a place" (POI search)
-- ============================================================================

-- Geospatial support --------------------------------------------------------
create extension if not exists postgis;

-- Enum for property type ----------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'property_type') then
    create type property_type as enum ('apartment', 'house', 'studio', 'villa', 'room', 'office');
  end if;
end$$;

-- Listings ------------------------------------------------------------------
create table if not exists public.listings (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  type          property_type not null default 'apartment',
  price         integer not null,                 -- monthly rent in TND
  bedrooms      smallint not null default 1,
  bathrooms     smallint not null default 1,
  area_sqm      integer,                          -- surface in m²
  governorate   text,                             -- e.g. 'Tunis', 'Ariana'
  delegation    text,                             -- e.g. 'La Marsa'
  address       text,
  image_urls    text[] not null default '{}',
  phone         text,
  owner_id      uuid references auth.users(id) on delete set null,
  lat           double precision not null,
  lng           double precision not null,
  -- Generated geography point kept in sync with lat/lng automatically.
  geom          geography(Point, 4326)
                  generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Spatial + filter indexes --------------------------------------------------
create index if not exists listings_geom_idx on public.listings using gist (geom);
create index if not exists listings_price_idx on public.listings (price);
create index if not exists listings_type_idx on public.listings (type);

-- ----------------------------------------------------------------------------
-- RPC: listings inside the current map viewport (bounding box), with filters.
-- ----------------------------------------------------------------------------
create or replace function public.listings_in_bbox(
  min_lng     double precision,
  min_lat     double precision,
  max_lng     double precision,
  max_lat     double precision,
  min_price   integer default null,
  max_price   integer default null,
  types       text[]  default null,
  min_beds    integer default null,
  max_results integer default 500
)
returns setof public.listings
language sql
stable
as $$
  select *
  from public.listings l
  where l.is_active
    and l.geom && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    and (min_price is null or l.price >= min_price)
    and (max_price is null or l.price <= max_price)
    and (types is null or l.type::text = any(types))
    and (min_beds is null or l.bedrooms >= min_beds)
  order by l.created_at desc
  limit max_results;
$$;

-- ----------------------------------------------------------------------------
-- RPC: listings within `radius_m` metres of a point (POI radius search).
-- Returns the distance so the UI can sort / display "1.2 km away".
-- ----------------------------------------------------------------------------
create or replace function public.listings_in_radius(
  center_lng  double precision,
  center_lat  double precision,
  radius_m    double precision,
  min_price   integer default null,
  max_price   integer default null,
  types       text[]  default null,
  min_beds    integer default null,
  max_results integer default 500
)
returns table (
  id           uuid,
  title        text,
  description  text,
  type         property_type,
  price        integer,
  bedrooms     smallint,
  bathrooms    smallint,
  area_sqm     integer,
  governorate  text,
  delegation   text,
  address      text,
  image_urls   text[],
  phone        text,
  owner_id     uuid,
  lat          double precision,
  lng          double precision,
  is_active    boolean,
  created_at   timestamptz,
  distance_m   double precision
)
language sql
stable
as $$
  select
    l.id, l.title, l.description, l.type, l.price, l.bedrooms, l.bathrooms,
    l.area_sqm, l.governorate, l.delegation, l.address, l.image_urls, l.phone, l.owner_id,
    l.lat, l.lng, l.is_active, l.created_at,
    st_distance(l.geom, st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography) as distance_m
  from public.listings l
  where l.is_active
    and st_dwithin(
          l.geom,
          st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography,
          radius_m
        )
    and (min_price is null or l.price >= min_price)
    and (max_price is null or l.price <= max_price)
    and (types is null or l.type::text = any(types))
    and (min_beds is null or l.bedrooms >= min_beds)
  order by distance_m asc
  limit max_results;
$$;

-- Row Level Security --------------------------------------------------------
alter table public.listings enable row level security;

drop policy if exists "public read active listings" on public.listings;
create policy "public read active listings"
  on public.listings
  for select
  using (is_active = true);

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

drop policy if exists "owners read own listings" on public.listings;
create policy "owners read own listings"
  on public.listings
  for select
  to authenticated
  using (auth.uid() = owner_id);

-- Profiles + admin ------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  is_admin   smallint not null default 0 check (is_admin in (0, 1)),
  created_at timestamptz not null default now()
);

create index if not exists profiles_is_admin_idx on public.profiles (is_admin);

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

-- ============================================================================
-- Seed data — sample rentals around Grand Tunis (Tunis, Ariana, La Marsa...)
-- ============================================================================
-- Only seed when the table is empty, so re-running this file is idempotent.
insert into public.listings
  (title, description, type, price, bedrooms, bathrooms, area_sqm, governorate, delegation, address, image_urls, phone, lat, lng)
select
  title, description, type::property_type, price, bedrooms, bathrooms, area_sqm,
  governorate, delegation, address, image_urls, phone, lat, lng
from (values
  ('Appartement lumineux à La Marsa', 'Bel appartement proche de la plage, récemment rénové.', 'apartment', 1200, 2, 1, 95, 'Tunis', 'La Marsa', 'Avenue Habib Bourguiba, La Marsa', array['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'], '+216 20 111 001', 36.8783, 10.3247),
  ('Studio moderne au Lac 2', 'Studio meublé idéal pour jeune actif, résidence sécurisée.', 'studio', 850, 1, 1, 45, 'Tunis', 'Les Berges du Lac', 'Rue du Lac Turkana, Lac 2', array['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'], '+216 22 222 002', 36.8425, 10.2680),
  ('Villa avec jardin à Sidi Bou Said', 'Villa spacieuse avec jardin et vue mer partielle.', 'villa', 3500, 4, 3, 260, 'Tunis', 'Sidi Bou Said', 'Rue Sidi Dhrif, Sidi Bou Said', array['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'], '+216 23 333 003', 36.8700, 10.3470),
  ('Appartement familial à Ariana', 'Grand appartement 3 chambres proche écoles et commerces.', 'apartment', 1400, 3, 2, 130, 'Ariana', 'Ariana Ville', 'Avenue de l Independance, Ariana', array['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'], null, 36.8625, 10.1956),
  ('Maison à Menzah 6', 'Maison de charme dans quartier calme et résidentiel.', 'house', 2200, 3, 2, 180, 'Ariana', 'El Menzah', 'Rue de Rome, Menzah 6', array['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'], null, 36.8380, 10.1720),
  ('Studio étudiant au centre-ville', 'Studio compact près de la station de métro, idéal étudiant.', 'studio', 600, 1, 1, 35, 'Tunis', 'Tunis Centre', 'Avenue de Paris, Tunis', array['https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800'], null, 36.8008, 10.1817),
  ('Appartement neuf à Ennasr', 'Appartement neuf dans résidence avec parking et ascenseur.', 'apartment', 1100, 2, 1, 105, 'Ariana', 'Ennasr', 'Rue Ibn Khaldoun, Ennasr 2', array['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'], null, 36.8540, 10.1650),
  ('Villa de standing aux Berges du Lac', 'Villa haut de gamme avec piscine, quartier prisé.', 'villa', 5000, 5, 4, 400, 'Tunis', 'Les Berges du Lac', 'Rue du Lac Victoria, Lac 1', array['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'], '+216 27 777 007', 36.8330, 10.2450),
  ('Chambre meublée à El Manar', 'Chambre en colocation, proche université El Manar.', 'room', 400, 1, 1, 20, 'Tunis', 'El Manar', 'Campus El Manar, Tunis', array['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800'], null, 36.8380, 10.1450),
  ('Bureau open-space au Lac 1', 'Plateau de bureaux modulable, fibre optique.', 'office', 2800, 1, 2, 150, 'Tunis', 'Les Berges du Lac', 'Rue du Lac Malaren, Lac 1', array['https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800'], null, 36.8290, 10.2380),
  ('Appartement vue mer à Gammarth', 'Terrasse avec vue sur la mer, résidence balnéaire.', 'apartment', 1800, 2, 2, 120, 'Tunis', 'Gammarth', 'Route de Gammarth, La Marsa', array['https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800'], null, 36.9180, 10.2870),
  ('Maison traditionnelle à la Médina', 'Dar authentique restaurée au cœur de la Médina de Tunis.', 'house', 1600, 3, 2, 160, 'Tunis', 'Médina', 'Rue Sidi Ben Arous, Médina', array['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'], null, 36.7980, 10.1710),
  ('Studio à Bardo', 'Studio propre et bien situé proche du musée du Bardo.', 'studio', 550, 1, 1, 40, 'Tunis', 'Le Bardo', 'Avenue Habib Bourguiba, Le Bardo', array['https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800'], null, 36.8090, 10.1400),
  ('Appartement à Mutuelleville', 'Appartement bourgeois, hauts plafonds, quartier central.', 'apartment', 1500, 3, 2, 140, 'Tunis', 'Mutuelleville', 'Rue de Palestine, Mutuelleville', array['https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800'], null, 36.8190, 10.1720),
  ('Villa avec piscine à Soukra', 'Villa récente avec grand jardin et piscine.', 'villa', 3200, 4, 3, 300, 'Ariana', 'La Soukra', 'Route de la Soukra, Ariana', array['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'], '+216 29 999 015', 36.8720, 10.2360)
) as seed(title, description, type, price, bedrooms, bathrooms, area_sqm, governorate, delegation, address, image_urls, phone, lat, lng)
where not exists (select 1 from public.listings);
