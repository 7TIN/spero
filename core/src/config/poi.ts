export type PoiProvider = "geoapify" | "overpass";

const configuredProvider = Bun.env.POI_PROVIDER?.trim().toLowerCase();

/** Geoapify Places API key. Free plan: 3,000 credits/day. */
export const GEOAPIFY_API_KEY = Bun.env.GEOAPIFY_API_KEY?.trim() ?? "";

/**
 * Which hosted provider supplies POIs. Set `POI_PROVIDER` to override;
 * otherwise Geoapify is used when a key is configured, and Overpass when not.
 */
export const POI_PROVIDER: PoiProvider =
  configuredProvider === "geoapify" || configuredProvider === "overpass"
    ? configuredProvider
    : GEOAPIFY_API_KEY
      ? "geoapify"
      : "overpass";

export const GEOAPIFY_URL =
  Bun.env.GEOAPIFY_URL ?? "https://api.geoapify.com/v2/places";

/** Maximum results per request (the API caps this at 500). */
export const GEOAPIFY_PAGE_SIZE = 500;

/**
 * Pages fetched per refresh. Each page of 500 places costs roughly 26 credits,
 * so two pages (~51 credits) keep a cold refresh well inside the free tier.
 */
export const GEOAPIFY_MAX_PAGES = 2;

export const GEOAPIFY_REQUEST_TIMEOUT_MS = 15_000;
