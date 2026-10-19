/**
 * Overpass API endpoints, tried in order until one answers. The first three are
 * the main global instances; the rest are additional global mirrors so a
 * regional block or a single outage does not take the app down.
 *
 * Do NOT add region-limited mirrors (for example `overpass.osm.ch`, which only
 * carries Swiss data): a 200 response with no elements would be cached as an
 * empty tile.
 */
const DEFAULT_OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.jp/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
].join(",");

export const OVERPASS_URLS = (Bun.env.OVERPASS_URLS ?? DEFAULT_OVERPASS_URLS)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

/** Overpass asks clients to identify themselves. */
export const OVERPASS_USER_AGENT =
  Bun.env.OVERPASS_USER_AGENT ?? "spero/0.1 (+https://github.com/7TIN/spero)";

/** Server-side query timeout, in seconds. */
export const OVERPASS_QUERY_TIMEOUT_S = 25;

/**
 * HTTP timeout for a single request, in milliseconds. Kept short so a hung
 * endpoint fails over to the next one instead of stalling the map.
 */
export const OVERPASS_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Minimum gap between any two Overpass requests. All calls are serialised
 * behind this so a burst of map movement cannot hammer the public servers.
 */
export const OVERPASS_MIN_REQUEST_GAP_MS = 1_000;

/** Delay before trying the next endpoint after a retryable failure, in ms. */
export const OVERPASS_ENDPOINT_RETRY_DELAY_MS = 2_000;

/** Random extra delay added per endpoint, in milliseconds. */
export const OVERPASS_ENDPOINT_RETRY_JITTER_MS = 500;

/**
 * Once every endpoint has failed, stop calling Overpass for this long so we do
 * not turn a busy server into a retry storm. Stale cache is served meanwhile.
 */
export const OVERPASS_COOLDOWN_MS = 30_000;

/** Timeout for the lightweight reachability probe used by `/health`. */
export const OVERPASS_PROBE_TIMEOUT_MS = 5_000;
