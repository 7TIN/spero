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

## Database

Local PostGIS via Docker:

```bash
docker compose up -d
cp core/.env.example core/.env
```

The database is exposed on `localhost:5432` and its data is kept in the named
`spero-postgres-data` volume.

### Hosted Postgres (Neon)

A hosted Postgres also works. Put the connection string in `core/.env`, keeping
`sslmode=require`:

```
DATABASE_URL=postgresql://user:password@host.neon.tech/neondb?sslmode=require
```

The import script enables PostGIS (`CREATE EXTENSION IF NOT EXISTS postgis`)
before it runs osm2pgsql, so no manual extension setup is needed.

## Import OSM data

Install [osm2pgsql](https://osm2pgsql.org/doc/install.html) 2.x and make sure it
is on `PATH` (or set `OSM2PGSQL_BIN`). Then:

```bash
bun run db:import
```

The script enables PostGIS, downloads the western-zone extract from Geofabrik
into `core/data/` (gitignored), imports POIs into the `pois` table with the flex
style in `core/scripts/pois.lua`, and creates the spatial indexes. Use
`bun run db:import --force` to download a fresh extract.

Re-importing into a database that already has a `pois` table requires dropping
it first (or recreating the database volume).

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
| GET    | `/health`                                                | API and database health            |
| GET    | `/api/hotzones?bbox=minLng,minLat,maxLng,maxLat&cell=250&radius=500` | GeoJSON grid cells with `score` and `breakdown` |
| GET    | `/api/pois?bbox=minLng,minLat,maxLng,maxLat&categories=school,hospital` | GeoJSON POIs with `name` and `category` |

`bbox` must span no more than about 15 km in either direction; larger requests
return `400`.

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
