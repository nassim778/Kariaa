# Karia — Map-first rental platform for Tunisia

Karia is a map-first real estate rental platform. The map opens fullscreen, rental
listings appear as price pins, and you explore by panning/zooming. You can also
pick any place (a hospital, university, neighbourhood…) and see every rental
within a chosen radius (default **2 km**) around it.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **MapLibre GL** with **OpenStreetMap** raster tiles (no API key required)
- **Supabase / PostgreSQL + PostGIS** for geospatial search
- **Nominatim** (OpenStreetMap) for place/POI geocoding

## Key features

- Fullscreen, map-first browsing of rentals across Grand Tunis
- "Search as you move the map" — listings load for the current viewport (PostGIS bounding-box query)
- **POI radius search** — pick a place and find rentals within 1/2/5/10 km (PostGIS `ST_DWithin`)
- Filters: property type, price range (TND), bedrooms
- Side list synced with the map + click-to-focus pins with photo popups
- Works with **zero backend setup** thanks to bundled demo data

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no environment variables set, Karia serves the
bundled demo listings (see the "Données démo" badge), so everything works out of
the box.

## Connecting Supabase (real data)

1. Create a Supabase project.
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It enables
   PostGIS, creates the `listings` table + spatial indexes, the two search RPCs
   (`listings_in_bbox`, `listings_in_radius`), row-level security, and seed rows.
3. Copy `.env.local.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```

4. Restart `npm run dev`. The badge now reads "Supabase · PostGIS" and all map
   queries hit the database.

## How the geospatial search works

- **Viewport:** on every `moveend` the map sends its bounding box to
  `/api/listings`, which calls `listings_in_bbox(...)` (an `ST_MakeEnvelope` +
  GiST index scan).
- **Radius:** picking a place calls `/api/listings` with a center + radius, which
  calls `listings_in_radius(...)` using `ST_DWithin` on a `geography` column and
  returns each result's distance for sorting and display.
- Both paths accept the same filters (price, type, bedrooms).

## Notes for production (Tunisia context)

- Address geocoding is unreliable in Tunisia — the listing map pin is the source
  of truth, not a typed address.
- Nominatim has a strict usage policy; for production, self-host it or use a paid
  geocoder, and cache results.
- Swap OSM raster tiles for a vector-tile provider (e.g. MapTiler) for crisp
  Arabic/French labels and better performance.
- Add phone/OTP auth (phone is the primary identity in Tunisia) and local payment
  gateways (Flouci, Konnect, Paymee) for monetization.

## Project structure

```
app/
  api/listings/route.ts   # bbox + radius search (Supabase RPC or demo fallback)
  api/geocode/route.ts     # Nominatim proxy for place search
  page.tsx                 # loads the map explorer (client-only)
components/
  MapExplorer.tsx          # state + data fetching orchestrator
  MapView.tsx              # MapLibre map, pins, radius circle, POI marker
  PlaceSearch.tsx          # place/POI autocomplete
  FiltersBar.tsx           # type / price / beds / radius filters
  Sidebar.tsx              # synced listings list
lib/
  types.ts, supabaseServer.ts, demoListings.ts
supabase/schema.sql        # PostGIS schema + RPCs + seed
```
