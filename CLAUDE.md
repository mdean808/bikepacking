# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm**.

- `pnpm dev` — start the Vite dev server (`--open` to open a browser)
- `pnpm build` / `pnpm preview` — production build and preview
- `pnpm check` — type-check with `svelte-check` (`pnpm check:watch` to watch). This is the closest thing to a lint step; there is no separate linter or test suite.
- `pnpm format` — Prettier (with Svelte + Tailwind plugins)

## Environment

`src/lib/immich.ts` reads two private env vars from `$env/static/private` (set in `.env`):

- `IMMICH_URL` — base URL of the self-hosted Immich instance
- `IMMICH_API_KEY`

These are required for the page's server load to succeed. Note `parseAssets` in `src/lib/assets.ts` hardcodes `https://photos.mogdan.xyz` for the browser-facing thumbnail URLs.

## Architecture

Single-page SvelteKit app that renders bikepacking trips on a satellite map: GPX day-routes plus geotagged photos pulled from Immich.

**Stack:** SvelteKit 2 + Svelte 5 (runes forced on via `vite.config.ts` — always use `$state`/`$derived`/`$props`), Tailwind 4, shadcn-svelte (`components.json`, generated UI under `src/lib/components/ui/`), maplibre-gl via `svelte-maplibre-gl`.

**Data flow for the one route (`/`):**

1. `+page.server.ts` runs server-side: fetches all Immich album assets and a share key, resolves the trip from `?trip=` query param (defaults to first trip).
2. `+page.ts` has `ssr = false` (whole app is client-rendered) and merges the server data with `TRIPS`.
3. `+page.svelte` → `BikeMap.svelte` is the orchestrator that composes the map layers.

**Trips (`src/lib/trip.ts`):** The `TRIPS` array is the source of truth. GPX files are loaded eagerly with `import.meta.glob('$lib/assets/gpx/**/*.gpx', ?raw)` and converted to GeoJSON via `@tmcw/togeojson`. `buildDays(folder, meta)` zips hand-authored day metadata with the GPX tracks **matched by sorted order** (`day_1.gpx` → `meta[0]`). To add a trip: drop `day_N.gpx` files in `src/lib/assets/gpx/<folder>/`, add a `Trip` entry with the Immich `album` UUID and per-day metadata.

**Immich integration (`src/lib/immich.ts` + `src/lib/assets.ts`):** Immich's thumbnail/original endpoints require auth, so `getAlbumShareKey` creates (or reuses) an album shared link and appends its `key` query param to image URLs so the browser can load them unauthenticated. `parseAssets` maps assets to `Image` objects, using EXIF `latitude`/`longitude` to place photo markers (falls back to `-1`).

**Map rendering (`src/lib/components/map/`):** `Map.svelte` wraps `MapLibre` with a custom Google hybrid (satellite + roads) raster style and auto-fits to `bounds`. `BikeMap.svelte` renders, per day, a `DayRoute` (line layer, color from `DAY_COLORS` in `geo.ts`) and a `DayMarker` at the route start, plus an `ImageMarker` per photo. Clicking a route/marker opens `RouteModal`; clicking a photo opens `ImageModal`.

**Hover coordination** in `BikeMap.svelte` is subtle: route-layer hover, day-marker hover, and image-marker hover are tracked as separate `$state` because the map canvas fires `mouseleave` for a layer when the cursor moves onto an overlapping DOM marker, which would race. Image markers (DOM overlays) take precedence over routes underneath — `imageHovered` suppresses route highlighting and blocks the route modal.
