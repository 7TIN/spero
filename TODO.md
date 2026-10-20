# TODO

Ideas deferred beyond Phase 2:

- Add Drizzle ORM over `bun:sqlite` (see `docs/phase-2-drizzle.md`).
- Self-hosted Overpass or Overture Maps if the public Overpass API becomes a
  bottleneck.
- Authentication and per-user saved areas.
- Multiple pinned cells (the current lock pins one area at a time).
- Address search and fly-to.
- A general competitor layer independent of a selected cell.
- Optional place details enrichment (Geoapify Place Details) for phone, website,
  and opening hours that are missing from the Places response.
- Google Places / other commercial POI providers.
- Time-of-day crowd estimates and historical trends.
- Vector tiles / precomputed grid for larger areas.
- POI de-duplication and manual category overrides.
- CSV / GeoJSON export of hot zones.
