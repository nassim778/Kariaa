-- Migration: multiple listing images (image_urls[]) + contact phone.

alter table public.listings
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists phone text;

-- Backfill from legacy single image_url column when present.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listings'
      and column_name = 'image_url'
  ) then
    update public.listings
    set image_urls = array[image_url]
    where image_url is not null
      and image_url <> ''
      and (image_urls is null or image_urls = '{}');

    alter table public.listings drop column image_url;
  end if;
end$$;

-- Radius RPC must include new columns (return type changed → drop first).
drop function if exists public.listings_in_radius(
  double precision, double precision, double precision,
  integer, integer, text[], integer, integer
);

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
    l.area_sqm, l.governorate, l.delegation, l.address, l.image_urls, l.phone,
    l.owner_id, l.lat, l.lng, l.is_active, l.created_at,
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
