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

This repo is an npm workspaces monorepo:

```
apps/web       Next.js web app (Render)
apps/mobile    Expo React Native app
packages/shared  Shared types, i18n, queries, validation
supabase/      schema.sql + migrations/
```

```bash
npm install
npm run dev          # web at http://localhost:3000
```

With no environment variables set (development only), Karia serves bundled demo
listings. If Supabase is configured and the backend fails, the UI shows an error
instead of silent demo data.

### Database

- Greenfield: run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor, **or**
- Incremental: `SUPABASE_PROJECT_REF=… SUPABASE_DB_PASSWORD=… npm run db:migrate`

New changes go in `supabase/migrations/` only. Refresh `schema.sql` when you want a full snapshot.

### Mobile

See [`apps/mobile/README.md`](apps/mobile/README.md). Set EAS Secrets for
`EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_GEOCODE_BASE_URL`, and
`EXPO_PUBLIC_LEGAL_BASE_URL` before production builds.

API contract: [`docs/api.md`](docs/api.md).

## Connecting Supabase (real data)

1. Create a Supabase project.
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It enables
   PostGIS, creates the `listings` table + spatial indexes, the two search RPCs
   (`listings_in_bbox`, `listings_in_radius`), row-level security, and seed rows.
   Then apply newer migrations with `npm run db:migrate` (needs `SUPABASE_PROJECT_REF` + `SUPABASE_DB_PASSWORD`).
3. Copy `apps/web/.env.local.example` to `apps/web/.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
   ```

4. Restart `npm run dev`.

## Deploy online (free, no Vercel)

Karia needs a **Node.js** host (API routes for listings + geocoding). Recommended: **[Render](https://render.com)** free tier.

### 1. Push code to GitHub

Repo: `https://github.com/nassim778/Kariaa.git`

### 2. Create the web service on Render

1. Sign up at [render.com](https://render.com) with GitHub.
2. **New → Web Service** → select the **Kariaa** repository.
3. Settings (Render usually auto-fills these):
   - **Runtime:** Node
   - **Build command:** `npm ci && npm run build`
   - **Start command:** `npm start`
   - **Plan:** Free
   - **Region:** Frankfurt (closest to Tunisia)
4. **Environment variables** (from your `.env.local`):

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role key (account deletion) |

5. Click **Create Web Service**. First deploy takes ~5–10 minutes.

Your URL will look like: `https://karia-xxxx.onrender.com`

> **Free tier note:** the app sleeps after ~15 min without traffic. The first visit after sleep may take 30–60 s to wake up.

### 3. Configure Supabase for production

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication → URL Configuration**:

- **Site URL:** `https://YOUR-RENDER-URL.onrender.com`
- **Redirect URLs:** add `https://YOUR-RENDER-URL.onrender.com/**` and specifically `https://YOUR-RENDER-URL.onrender.com/reset-password`

Password reset (email) lands on `/reset-password` where the user must set a new password (not auto-login only).

Phone/SMS password reset is deferred for a later release.


Under **Project Settings → API**, confirm the anon key matches what you set on Render.

### 4. (Optional) Custom domain

Render free tier supports custom domains (e.g. `karia.tn`) in **Settings → Custom Domains**.

### Alternative free hosts

| Host | Config file | Notes |
|------|-------------|-------|
| [Netlify](https://www.netlify.com) | `netlify.toml` | Free, good Next.js support |
| [Koyeb](https://www.koyeb.com) | Docker / Node | Free nano instance |
| [Fly.io](https://fly.io) | `fly.toml` (manual) | Small free allowance |

`render.yaml` in this repo can also be used via **New → Blueprint** for one-click setup.

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
