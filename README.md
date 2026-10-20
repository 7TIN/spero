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
Phase 2 reads crowd POIs and competitor places from the hosted
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
  0.05° tiles reused for 30 days, so panning does not spend credits. Crowd POIs
  and each competitor business type have separate tile sets. A cold crowd
  refresh costs roughly 26–51 credits (500–1,000 places); a competitor refresh
  usually costs far less because it asks for one category.
- `/health` reports today's estimated Geoapify credits and the free-plan limit.
- Switching providers or changing the cached place shape clears the cache
  automatically, so results from different providers are never mixed.
- Place cards show address, phone, website, and opening hours only when the
  provider supplies them. No photos or Google Places/POI API calls are used.
  The optional Spero Agent calls Gemini separately when configured. The
  "Open in Google Maps" button is a free search URL that opens a new tab.
- Place data is attributed to Geoapify and OpenStreetMap on the map.
- Address and place search uses the public
  [Nominatim](https://nominatim.openstreetmap.org/) endpoint. Searches run only
  when submitted, are cached for ten minutes, and are serialised to respect
  Nominatim's one-request-per-second policy. Set `NOMINATIM_URL` to a
  self-hosted instance for production traffic.

## Spero Agent

The bottom chat box turns a sentence such as "I want to start a gym in this
area" into map controls. The API route validates the request, asks Gemini for a
strict JSON plan, validates the JSON again, geocodes any named place, and only
then returns controls the web app can apply. The key never reaches the browser.

```bash
# core/.env
GEMINI_API_KEY=...
# Optional; defaults to the low-latency model below.
GEMINI_MODEL=gemini-3.5-flash-lite
```

Without `GEMINI_API_KEY`, `/api/agent` uses a deterministic quick planner that
handles common locations, business types, categories, basemaps, and range
controls. The chat response labels which planner produced it. The agent can:

- move the map to a city, neighbourhood, or address;
- switch the competitor business type and show competitors in the new view;
- enable place categories;
- change cell size, reach radius, basemap, and selection mode;
- clear a selected cell so the standalone viewport competitor layer is used.

It does not multi-select cells: the grid already draws every hot-zone cell in
the current view. It also cannot invent scores, coordinates, or competitor
counts.

### Overpass fallback

If you set `POI_PROVIDER=overpass`, the API uses the public Overpass endpoints.
They default to `overpass-api.de`, with five other global mirrors
(`kumi.systems`, `private.coffee`, `osm.jp`, `openstreetmap.ru`,
`nchc.org.tw`); override with `OVERPASS_URLS`. Requests are serialised with a
minimum gap and back off for 30 s after every endpoint fails.

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
| GET    | `/health`                                                | API, cache, credits, and Overpass status |
| GET    | `/api/hotzones?bbox=minLng,minLat,maxLng,maxLat&cell=250&radius=500` | GeoJSON grid cells with `score` and `breakdown` |
| GET    | `/api/pois?bbox=minLng,minLat,maxLng,maxLat&categories=school,hospital` | GeoJSON POIs with `name`, `category`, and place details |
| GET    | `/api/places?bbox=minLng,minLat,maxLng,maxLat&type=cafe` | GeoJSON competitor places for one business type |
| GET    | `/api/geocode?q=Koregaon%20Park&limit=5`                  | Address/place search results with coordinates and optional bounds |
| POST   | `/api/agent`                                              | Validated map-control plan for a natural-language request |

`bbox` must span no more than about 15 km in either direction; larger requests
return `400`. An unknown `type` on `/api/places` also returns `400`. Supported
types are `cafe`, `restaurant`, `pharmacy`, `gym`, `salon`, `bakery`, `grocery`,
`clothing`, `electronics`, and `bank`.

`POST /api/agent` accepts `{ "query": "...", "context": { ... } }` where
`context` is the current view, selection, filters, and range controls. It
returns `{ message, source, location, actions }`; unsupported model output is
rejected instead of being applied.

`/health` reports the cache size, today's estimated Geoapify credits, and the
configured Overpass endpoints. Add `?probe=1` to also check whether Overpass is
reachable right now.

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
bun run test       # run the core unit tests
```

## Workspace packages

| Package         | Path     | Description                   |
| --------------- | -------- | ----------------------------- |
| `@spero/core`   | `core`   | Hono HTTP API                 |
| `@spero/shared` | `shared` | Shared TypeScript types       |
| `@spero/web`    | `web`    | React app, Vite, Tailwind CSS |

Packages are linked by Bun workspaces. Depend on one from another with
`"@spero/core": "workspace:*"`.
