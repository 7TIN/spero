# Spero

A Bun workspace monorepo.

## Structure

```
spero/
├── core/    # @spero/core   — Hono API running on Bun
├── shared/  # @spero/shared — shared TypeScript types
└── web/     # @spero/web    — React + Vite + Tailwind CSS v4
```

## Requirements

- [Bun](https://bun.com) 1.4+
- Node.js 20+ (Vite and the shadcn CLI)

## Setup

```bash
bun install
```

## Data (hosted provider + local cache)

No database to run, no OSM extract to download, and nothing to self-host.
Phase 1 reads crowd POIs from the hosted
[Geoapify Places API](https://www.geoapify.com/places-api/) and caches them in a
local SQLite file (`bun:sqlite`):

```bash
cp core/.env.example core/.env
# then paste your key into core/.env
```

1. Create a free key at <https://myprojects.geoapify.com/> (3,000 credits/day, no
   credit card required).
2. Set `GEOAPIFY_API_KEY=...` in `core/.env`.
3. Restart `bun run dev`.

- Geoapify is used automatically when the key is set. Without a key the app falls
  back to the public Overpass API, which is currently unreliable.
- The cache lives in `core/data/tiles.sqlite` (gitignored). The map is split into
  0.05° tiles reused for 30 days, so panning does not spend credits. A cold
  refresh costs roughly 26–51 credits (500–1,000 places).
- Switching providers clears the cache automatically, so results from two
  providers are never mixed.

### Overpass fallback

If you set `POI_PROVIDER=overpass`, the API uses the public Overpass endpoints.
They default to `overpass-api.de`, with five other global mirrors
(`kumi.systems`, `private.coffee`, `osm.jp`, `openstreetmap.ru`,
`nchc.org.tw`); override with `OVERPASS_URLS`. Requests are serialised with a
minimum gap and back off for 30 s after every endpoint fails.

### Optional: bulk import into PostGIS

The older osm2pgsql path is still in the repo but is not used by phase 1. To use
it, run `docker compose up -d`, put a `DATABASE_URL` in `core/.env`, install
[osm2pgsql](https://osm2pgsql.org/doc/install.html) 2.x, and run:

```bash
bun run db:import
```

It downloads the western-zone extract into `core/data/` (gitignored), imports
`pois` with `core/scripts/pois.lua`, and creates the spatial indexes.

## Web environment

```bash
cp web/.env.example web/.env
```

`VITE_MAP_STYLE_URL` (and the optional `VITE_MAP_STYLE_URL_DARK`) can point at a
MapTiler or Stadia style with your key. When they are not set, the app falls
back to the free CARTO light and dark basemaps, so the map works out of the box.
The panel's **Basemap** switch also offers the classic OpenStreetMap raster
tiles (the standard OSM map with parks, water, and land use). It uses the public
`tile.openstreetmap.org` server, which is suitable for development and light
use; see the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
before deploying.
`VITE_API_URL` defaults to `http://localhost:3000`.

## API

| Method | Route                                                    | Description                        |
| ------ | -------------------------------------------------------- | ---------------------------------- |
| GET    | `/health`                                                | API, cache, and Overpass status    |
| GET    | `/api/hotzones?bbox=minLng,minLat,maxLng,maxLat&cell=250&radius=500` | GeoJSON grid cells with `score` and `breakdown` |
| GET    | `/api/pois?bbox=minLng,minLat,maxLng,maxLat&categories=school,hospital` | GeoJSON POIs with `name` and `category` |

`bbox` must span no more than about 15 km in either direction; larger requests
return `400`.

`/health` reports the cache size and the configured Overpass endpoints. Add
`?probe=1` to also check whether Overpass is reachable right now.

## Development

```bash
bun run dev        # run core and web together
bun run dev:core   # core only  -> http://localhost:3000
bun run dev:web    # web only   -> http://localhost:5173
```

## Other scripts

```bash
bun run build      # build every package that defines a build script
bun run typecheck  # type check every package
bun run lint       # lint every package that defines a lint script
```

## Workspace packages

| Package         | Path     | Description                   |
| --------------- | -------- | ----------------------------- |
| `@spero/core`   | `core`   | Hono HTTP API                 |
| `@spero/shared` | `shared` | Shared TypeScript types       |
| `@spero/web`    | `web`    | React app, Vite, Tailwind CSS |

Packages are linked by Bun workspaces. Depend on one from another with
`"@spero/core": "workspace:*"`.
