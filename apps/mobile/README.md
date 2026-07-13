# Karia Mobile (React Native + Expo)

Native iOS & Android app for Karia, the map-first Tunisian rental platform. It
reuses the existing Supabase backend (Auth, PostGIS RPCs, Storage) and the
shared TypeScript logic in [`packages/shared`](../../packages/shared), and
renders the map with the native MapLibre engine.

## Requirements

- Node.js >= 18.17
- A physical device or emulator (Expo Go is **not** supported because the app
  uses the native `@maplibre/maplibre-react-native` module — a custom dev
  client is required).
- For builds: an [Expo](https://expo.dev) account + `eas-cli`
  (`npm i -g eas-cli`).

## Setup

```bash
cd apps/mobile
npm install
cp .env.example .env   # then fill in your Supabase values
```

Align native dependency versions with the installed Expo SDK if needed:

```bash
npx expo install --fix
```

### Environment variables (`.env`)

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL. Empty → demo mode. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. Empty → demo mode. |
| `EXPO_PUBLIC_GEOCODE_BASE_URL` | Optional. Base URL of a deployed Karia web app; its `/api/geocode` + `/api/reverse-geocode` routes are used as a Nominatim proxy. When empty, Nominatim is called directly from the device. |

If Supabase is not configured the app runs on the bundled demo listings, just
like the web app.

## Running locally

The native MapLibre module means you need a **development build**, not Expo Go:

```bash
# 1) Generate the native projects
npx expo prebuild

# 2a) Build & run a dev client on a connected device / emulator
npm run android      # or: npm run ios   (macOS + Xcode required)

# 2b) ...or build a dev client in the cloud, install it, then:
npm start            # expo start --dev-client
```

## Production builds (EAS)

```bash
eas login
eas build:configure          # first time only

# Internal test builds
eas build --profile preview --platform android   # APK
eas build --profile preview --platform ios

# Store builds
eas build --profile production --platform all
eas submit  --profile production --platform all
```

The EAS profiles are defined in [`eas.json`](./eas.json). The `development`
profile produces a dev client for local iteration.

## Project structure

```
app/                     expo-router routes
  _layout.tsx            providers + Stack navigator
  index.tsx              Map screen (search, filters, POI radius, list sheet)
  auth.tsx               Sign in / sign up (modal)
  add-listing.tsx        Create / edit listing (modal)
  listing/[id].tsx       Listing detail (modal)
  my-listings.tsx        Owner dashboard
  admin.tsx              Admin dashboard (listings / users)
src/
  providers/             AuthProvider, LanguageProvider (RTL-aware)
  components/             MapCanvas, MiniMapPicker, PlaceSearch, FiltersSheet, …
  lib/                   Supabase client (SecureStore session), API wrappers
  theme.ts               Brand palette
```

Framework-agnostic code (types, i18n dictionaries, Supabase queries, demo data,
geocoding) lives in [`packages/shared`](../../packages/shared) and is shared
with the web app. It is resolved via the `@karia/shared` alias configured in
[`babel.config.js`](./babel.config.js), [`metro.config.js`](./metro.config.js),
and [`tsconfig.json`](./tsconfig.json).
