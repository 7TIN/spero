# @spero/core

Hono API running on Bun. Crowd data and competitor places come from the hosted
Geoapify Places API (with Overpass as an optional fallback) and are cached
locally in SQLite (`bun:sqlite`); no database server is required.

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
cp core/.env.example core/.env
# then paste your key into core/.env
```

- `GEOAPIFY_API_KEY` — Places API key from <https://myprojects.geoapify.com/>.
  The free plan covers 3,000 credits/day. When set, Geoapify is used.
- `POI_PROVIDER` — `geoapify` or `overpass`. Optional; defaults to `geoapify`
  when a key is present, otherwise `overpass`.
- `OVERPASS_URLS` — fallback endpoints, tried in order. Defaults to
  `overpass-api.de` plus five global mirrors (`kumi.systems`,
  `private.coffee`, `osm.jp`, `openstreetmap.ru`, `nchc.org.tw`). Do not add
  region-limited mirrors such as `overpass.osm.ch`; their empty responses would
  be cached as empty tiles.
- `OVERPASS_USER_AGENT` — sent with every Overpass request. Defaults to
  `spero/0.1`.
- `TILE_CACHE_PATH` — SQLite file. Defaults to `core/data/tiles.sqlite`
  (gitignored), or `/tmp/spero/tiles.sqlite` on Vercel where only `/tmp` is
  writable.

The map is split into 0.05° tiles. Crowd POIs and each competitor business type
have separate tile sets, fetched once and reused for 30 days (see
`src/config/cache.ts`). If the provider is unreachable, stale tiles are served
instead of failing the request. Changing `POI_PROVIDER` or the cached place
shape clears the cache so results from two providers are never mixed.

Geoapify credit use is estimated (one request credit plus one per 20 returned
places) and reported by `/health`; competitor requests are capped at two pages
of 500 places.

## API

| Method | Route                                                                   | Description                                      |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------ |
| GET    | `/health`                                                               | Cache size, credits, and POI provider (`?probe=1` checks Overpass reachability) |
| GET    | `/api/hotzones?bbox=minLng,minLat,maxLng,maxLat&cell=250&radius=500`     | GeoJSON grid cells with `score` and `breakdown`  |
| GET    | `/api/pois?bbox=minLng,minLat,maxLng,maxLat&categories=school,hospital`  | GeoJSON POIs with `name`, `category`, and details |
| GET    | `/api/places?bbox=minLng,minLat,maxLng,maxLat&type=cafe`                 | GeoJSON competitor places for one business type  |

`bbox` is validated with Zod and must span no more than about 15 km in either
direction. An unknown business type also returns `400`. Category weights, tile
settings, scoring defaults, and the business-type mapping live in `src/config`.
Grid generation is in `src/lib/grid.ts` and the TypeScript scoring in
`src/services/scoring.ts`.

## Tests

```bash
bun test
```

Covers scoring, grid generation, bbox/business-type validation, and the
business-type provider mapping.

## Entry point

`src/index.ts` exports the Hono app and is the entrypoint used by Vercel's Hono
framework preset. `src/server.ts` starts that app with `Bun.serve` for local
development and production Bun hosting. Its `idleTimeout` is raised from Bun's
10 s default because a cold provider fetch can take longer, and Bun would
otherwise reset the connection before the response is written.
