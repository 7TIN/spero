# @spero/web

React + TypeScript + Vite + Tailwind CSS v4.

## Development

From the repo root:

```bash
bun run dev:web
```

Or from this directory:

```bash
bun run dev
```

The app runs at `http://localhost:5173` by default.

## Environment

```bash
cp .env.example .env
```

`VITE_API_URL` defaults to `http://localhost:3000`.

`VITE_MAP_STYLE_URL` can point at a MapTiler or Stadia style with your key.
`VITE_MAP_STYLE_URL_DARK` is optional. Without either, the app uses the free
CARTO light and dark basemaps. The panel's **Basemap** switch also offers the
classic OpenStreetMap raster tiles (`tile.openstreetmap.org`), which is fine for
development and light use but subject to the
[tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

## Map

The map lives in `src/features/map`. It uses `react-map-gl/maplibre` with
`maplibre-gl`. Hot zones are fetched on `moveend` (debounced), cached with
TanStack Query, and rendered as a scored fill layer. POIs are shown from zoom
14 and can be filtered by category in the side panel. Default centre and zoom
come from `src/features/map/constants.ts`.

Clicking a hot-zone cell opens the cell panel on the left: every place within
the reach radius of the cell centre, grouped by category, with a button that
copies the whole list. The panel queries `/api/pois` for the cell's bounds and
filters by distance, so it needs no extra endpoint.

## Styling

Tailwind CSS is configured through the `@tailwindcss/vite` plugin in
`vite.config.ts`. `src/index.css` imports Tailwind, `tw-animate-css`, and
`shadcn/tailwind.css`, then defines the theme:

- `:root` holds the light theme variables.
- `.dark` overrides them for dark mode.
- The `.dark` class is applied to `<html>`.

Theme preference is read from `localStorage` and falls back to the system
preference. The toggle in `App.tsx` updates both.

Fonts are referenced through CSS variables but not bundled. Add your font files
or a font provider and set the `--app-font-*` variables in `src/index.css`.
