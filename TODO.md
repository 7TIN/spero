# TODO

Ideas deferred beyond Phase 1:

- Phase 2: add Drizzle ORM over `bun:sqlite` (see `docs/phase-2-drizzle.md`).
- Self-hosted Overpass or Overture Maps if the public Overpass API becomes a
  bottleneck.
- The optional PostGIS bulk import (`docker compose` + `db:import`) is unused in
  phase 1; delete it or keep it for offline use.
- Authentication and per-user saved areas.
- Business-type logic and competitor analysis.
- Google Places / other commercial POI providers.
- Time-of-day crowd estimates and historical trends.
- Vector tiles / precomputed grid for larger areas.
- POI de-duplication and manual category overrides.
- Address search and geocoding.
- CSV / GeoJSON export of hot zones.
