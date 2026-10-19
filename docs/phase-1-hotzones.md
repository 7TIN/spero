# Phase 1: Crowd hot zones on a map

## Goal

Show a map where each area is colored by how much crowd it likely attracts, based
on nearby crowd-drawing places (schools, colleges, hospitals, bus stands, markets,
etc.) from OpenStreetMap. Clicking an area explains why it scored that way.

No business-type logic, competitors, Google APIs, or auth yet.

## Existing setup (don't change)

Bun workspace with `core/` (Bun + Hono, `src/index.ts`) and `web/` (Vite + React
+ TS + Tailwind v4 + shadcn tokens).

## Step 1: Database (PostGIS)

- Add `docker-compose.yml` at the repo root with a `postgis/postgis` service, a
  named volume, and a port exposed for local dev.
- Add `core/.env.example` with `DATABASE_URL`.
- Use `postgres` (porsager) or `Bun.sql` as the client. No ORM.

## Step 2: Import OSM data

- Add `core/scripts/import-osm.sh` (or a Bun script) that:
  1. Downloads the Maharashtra extract from Geofabrik
     (`maharashtra-latest.osm.pbf`) into `core/data/` (gitignored).
  2. Runs `osm2pgsql` with a flex Lua style (`core/scripts/pois.lua`) that
     writes ONE table, `pois`:
     `osm_id bigint, category text, name text, geom geometry(Point, 4326)` with
     a GIST index.
  3. Polygons (buildings, campuses) are stored as their centroid.
- Tag-to-category mapping:

| category      | OSM tags                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| college       | amenity=college, university                                              |
| school        | amenity=school                                                           |
| hospital      | amenity=hospital, clinic                                                 |
| transport     | amenity=bus_station, railway=station, public_transport=station            |
| market        | amenity=marketplace, shop=mall, supermarket                              |
| worship       | amenity=place_of_worship                                                 |
| hotel         | tourism=hotel, guest_house                                               |
| office        | office=government, amenity=bank, townhall                                |
| entertainment | amenity=cinema, theatre                                                  |
| food          | amenity=restaurant, cafe, fast_food                                      |

- Document the import steps in the README.

## Step 3: Scoring (SQL, in core)

- Define category weights in ONE config file, `core/src/config/weights.ts`:
  transport 9, hospital 9, college 9, market 8, school 7, office 6,
  entertainment 6, hotel 5, worship 5, food 3.
- For each grid cell, score = sum over POIs within R meters of
  `weight * (1 - distance / R)` (linear decay). Default R = 500 m.
- Grid: square cells (default 250 m) generated for the requested bbox using
  `ST_SquareGrid` in a metric projection (EPSG:32643 for Maharashtra, or the
  agent's justified choice).
- Skip cells with score 0.
- Normalize scores to 0-100 per response (min-max, or percentile if it looks
  better).
- For each cell, also return a breakdown: top 3 contributing categories with
  counts.

## Step 4: API (Hono)

- `GET /api/hotzones?bbox=minLng,minLat,maxLng,maxLat&cell=250&radius=500`
  Returns GeoJSON FeatureCollection of polygons with properties
  `{ score, breakdown }`.
- `GET /api/pois?bbox=...&categories=school,hospital`
  Returns GeoJSON points with `{ name, category }`.
- Validate params with Zod. Reject bboxes that are too large (e.g. more than
  about 15 km across) with a 400 and a clear message.
- Enable CORS for the web dev origin.
- Add a `/health` route.

## Step 5: Web (map UI)

- Use `react-map-gl/maplibre` + `maplibre-gl`.
- Basemap: a free style (MapTiler or Stadia). Put the key in `web/.env` as
  `VITE_MAP_STYLE_URL`, with a `.env.example`.
- Default center and zoom come from constants, easy to change.
- Hot zone layer: fill layer, color ramp (transparent, yellow, orange, red) by
  `score`, opacity around 0.55.
- POI layer: small circles colored by category, visible only at zoom 14 or
  higher.
- Fetch on map `moveend`, debounced (400 ms), cancel in-flight requests, and use
  TanStack Query for caching.
- Side panel with shadcn components:
  - Category toggles (affects the POI layer).
  - Cell size and radius sliders.
  - Legend for the color ramp.
- Clicking a cell opens a popup with its score and the top 3 contributing
  categories.
- Show loading and error states. Keep light/dark theme working, including a
  dark basemap in dark mode if available.

## Structure

- `core/src/routes/`, `core/src/services/scoring.ts`, `core/src/db.ts`,
  `core/src/config/weights.ts`
- `web/src/features/map/` (MapView, HotzoneLayer, PoiLayer, ControlPanel,
  useHotzones)
- Shared types for the GeoJSON properties live in one place and are imported by
  both packages.

## Acceptance criteria

- `docker compose up -d` plus the import script gives a working DB from scratch
  following the README.
- Panning or zooming reloads hot zones without freezing the UI.
- `/api/hotzones` for a 5 km bbox responds in under 1 second locally.
- Known busy spots (bus stand, college area, market) show up as visibly hotter
  than residential outskirts.
- `bun run typecheck`, `lint`, and `build` pass.

## Constraints

- Do not add features beyond this spec. Note ideas in a TODO.md instead.
- Keep weights and defaults in config, not scattered through the code.
- Commit after each step with a clear message.
