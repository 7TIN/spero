/** Nominatim's public search endpoint. Override for a self-hosted instance. */
export const NOMINATIM_URL =
  Bun.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org/search";

/** Nominatim asks clients to identify themselves with a real User-Agent. */
export const NOMINATIM_USER_AGENT =
  Bun.env.NOMINATIM_USER_AGENT ??
  "Spero/0.1 (+https://github.com/7TIN/spero)";

/** Public Nominatim allows at most one request per second. */
export const NOMINATIM_MIN_INTERVAL_MS = 1_000;

export const NOMINATIM_TIMEOUT_MS = 10_000;

/** Cache identical searches briefly; this is not an autocomplete feed. */
export const GEOCODE_CACHE_TTL_MS = 10 * 60 * 1_000;

export const GEOCODE_CACHE_MAX_ENTRIES = 100;
