import { join } from "node:path";

/**
 * Fixed cache tile size in degrees. 0.05 degrees is roughly 5.2-5.5 km at
 * Indian latitudes, so a 15 km request only touches a handful of tiles.
 * Changing this invalidates existing cache files.
 */
export const TILE_SIZE_DEG = 0.05;

/** How long a cached tile stays fresh before it is refetched. */
export const TILE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * SQLite cache file. Local development uses core/data, which is gitignored.
 * Vercel Functions only allow writes under /tmp, so deployed instances get a
 * disposable per-instance cache there.
 */
const DEFAULT_TILE_CACHE_PATH = Bun.env.VERCEL
  ? "/tmp/spero/tiles.sqlite"
  : join(import.meta.dir, "../../data/tiles.sqlite");

export const TILE_CACHE_PATH =
  Bun.env.TILE_CACHE_PATH ?? DEFAULT_TILE_CACHE_PATH;

/** Safety cap on how many tiles a single request may need. */
export const MAX_TILES_PER_REQUEST = 64;
