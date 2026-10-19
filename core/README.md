# @spero/core

Hono API running on Bun, backed by PostGIS.

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

## Database

```bash
docker compose up -d
cp core/.env.example core/.env
```

## Import OSM data

Install [osm2pgsql](https://osm2pgsql.org/doc/install.html) 2.x and make sure it
is on `PATH` (or set `OSM2PGSQL_BIN`). Then, from the repo root:

```bash
bun run db:import
```

The script downloads the Maharashtra extract into `core/data/` (gitignored),
imports `pois` with `scripts/pois.lua`, and creates the indexes needed by the
scoring queries.

Re-importing over an existing `pois` table requires dropping it first, or
recreating the database volume with `docker compose down -v`.

## API

| Method | Route                                                                   | Description                                      |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------ |
| GET    | `/health`                                                               | API and database health                          |
| GET    | `/api/hotzones?bbox=minLng,minLat,maxLng,maxLat&cell=250&radius=500`     | GeoJSON grid cells with `score` and `breakdown`  |
| GET    | `/api/pois?bbox=minLng,minLat,maxLng,maxLat&categories=school,hospital`  | GeoJSON POIs with `name` and `category`          |

`bbox` is validated with Zod and must span no more than about 15 km in either
direction. Category weights and scoring defaults live in `src/config`.

## Entry point

`src/index.ts` exports the Hono app. Bun serves the app directly in development.
