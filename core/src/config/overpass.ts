/** Overpass API endpoints, tried in order until one answers. */
const DEFAULT_OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
].join(",");

export const OVERPASS_URLS = (Bun.env.OVERPASS_URLS ?? DEFAULT_OVERPASS_URLS)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

/** Overpass asks clients to identify themselves. */
export const OVERPASS_USER_AGENT =
  Bun.env.OVERPASS_USER_AGENT ?? "spero/0.1 (+https://github.com/7TIN/spero)";

/** Server-side query timeout, in seconds. */
export const OVERPASS_QUERY_TIMEOUT_S = 60;

/** HTTP timeout for a single request, in milliseconds. */
export const OVERPASS_REQUEST_TIMEOUT_MS = 60_000;

/** How many times to retry an endpoint before trying the next one. */
export const OVERPASS_MAX_ATTEMPTS_PER_URL = 2;

/** Base delay for the linear backoff between attempts, in milliseconds. */
export const OVERPASS_RETRY_BASE_DELAY_MS = 1_000;

/** Timeout for the lightweight reachability probe used by `/health`. */
export const OVERPASS_PROBE_TIMEOUT_MS = 5_000;
