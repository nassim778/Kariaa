# Karia HTTP API

Base URL: your deployed web app (e.g. `https://karia-xxxx.onrender.com`).

Error shape (all non-2xx and some 2xx with empty data):

```json
{ "error": { "code": "invalid_query", "message": "…" } }
```

| Status | Typical codes |
|--------|----------------|
| 400 | `invalid_query`, `invalid_body` |
| 401 | `unauthorized` |
| 409 | `already_reported` |
| 429 | `rate_limited` |
| 500 / 502 / 503 | `backend_unavailable`, `geocode_failed`, `delete_failed`, `not_configured` |

## `GET /api/listings`

Query params (validated):

- Radius: `centerLng`, `centerLat`, `radius` (50–100000 m)
- BBox: `minLng`, `minLat`, `maxLng`, `maxLat`
- Filters: `minPrice`, `maxPrice`, `minBeds`, `types` (comma-separated enum)

Success: `{ "listings": [...], "source": "supabase" | "demo" }`

`source: "demo"` only when Supabase env vars are missing (local zero-config). If Supabase is configured and fails → **500**, never silent demo data.

## `GET /api/geocode?q=&lang=`

Rate limit: 30 req/min/IP. Success: `{ "places": [...] }`.

## `GET /api/reverse-geocode?lat=&lng=&lang=`

Rate limit: 30 req/min/IP. Success: `{ governorate, delegation, address }`.

## `DELETE /api/account`

Header: `Authorization: Bearer <access_token>`  
Requires `SUPABASE_SERVICE_ROLE_KEY` on the server. Deletes storage, listings, auth user.

## `POST /api/report`

Header: `Authorization: Bearer <access_token>`  
Body: `{ "listingId": "<uuid>", "reason": "..." }`  
Requires migration `009_listing_reports.sql`.
