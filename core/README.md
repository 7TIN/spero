# @spero/core

Hono API running on Bun. Crowd data comes from the public Overpass API and is
cached locally in SQLite (`bun:sqlite`); no database server is required.

## Development

From the repo root:

```bash
bun run dev:core
```

Or from this directory:

```bash
bun run dev
```

The server listens on `http://localhost:3000` by default. Set `PORT` to change it.

## Data source

```bash
cp core/.env.example core/.env   # optional; defaults work without it
```

- `OVERPASS_URLS` — comma-separated Overpass endpoints, tried in order. Defaults
  to `overpass-api.de` plus `overpass.kumi.systems` and `overpass.private.coffee`.
- `OVERPASS_USER_AGENT` — sent with every request. Defaults to `spero/0.1`.
- `TILE_CACHE_PATH` — SQLite file. Defaults to `core/data/tiles.sqlite`
  (gitignored).

The map is split into 0.05° tiles. A tile is fetched from Overpass once and
reused for 30 days (see `src/config/cache.ts`). If Overpass is unreachable,
stale tiles are served instead of failing the request.

### Optional: bulk import into PostGIS

`scripts/import-osm.ts` is the older osm2pgsql path and is not used by phase 1.
It needs Docker, `DATABASE_URL` in `core/.env`, and osm2pgsql 2.x on `PATH`:

```bash
bun run db:import
```

## API

| Method | Route                                                                   | Description                                      |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------ |
| GET    | `/health`                                                               | Cache size and Overpass endpoints (`?probe=1` checks reachability) |
| GET    | `/api/hotzones?bbox=minLng,minLat,maxLng,maxLat&cell=250&radius=500`     | GeoJSON grid cells with `score` and `breakdown`  |
| GET    | `/api/pois?bbox=minLng,minLat,maxLng,maxLat&categories=school,hospital`  | GeoJSON POIs with `name` and `category`          |

`bbox` is validated with Zod and must span no more than about 15 km in either
direction. Category weights, tile settings, and scoring defaults live in
`src/config`. Grid generation is in `src/lib/grid.ts` and the TypeScript scoring
in `src/services/scoring.ts`.

## Entry point

`src/index.ts` exports the Hono app. Bun serves the app directly in development.
