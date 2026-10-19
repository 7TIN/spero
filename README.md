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

## Data (Overpass + local cache)

No database to run and no OSM extract to download. Phase 1 reads crowd POIs
from the public [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
and caches them in a local SQLite file (`bun:sqlite`):

```bash
cp core/.env.example core/.env   # optional; all defaults work without it
```

- Endpoints default to `overpass-api.de`, with `overpass.kumi.systems` as a
  fallback. Override with `OVERPASS_URLS`.
- The cache lives in `core/data/tiles.sqlite` (gitignored). The map is split
  into 0.05° tiles that are reused for 30 days, so repeated pans do not hit
  Overpass.
- If Overpass is unreachable, stale cached tiles are served instead of failing.

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
