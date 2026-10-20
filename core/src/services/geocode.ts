import type { GeocodeResult } from "@spero/shared";
import {
  GEOCODE_CACHE_MAX_ENTRIES,
  GEOCODE_CACHE_TTL_MS,
  NOMINATIM_MIN_INTERVAL_MS,
  NOMINATIM_TIMEOUT_MS,
  NOMINATIM_URL,
  NOMINATIM_USER_AGENT,
} from "../config/geocode";

/** Raised when Nominatim cannot answer a search. */
export class GeocodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeocodeError";
  }
}

/** Nominatim returns numbers as strings, and its bounding box is south/north/west/east. */
interface NominatimResult {
  place_id?: number | string;
  osm_type?: string;
  osm_id?: number | string;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  class?: string;
  type?: string;
  boundingbox?: [string, string, string, string];
}

interface CacheEntry {
  expiresAt: number;
  results: GeocodeResult[];
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<GeocodeResult[]>>();
let lastRequestAt = 0;

function parseNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBbox(value: unknown) {
  if (!Array.isArray(value) || value.length !== 4) return null;

  const south = parseNumber(value[0]);
  const north = parseNumber(value[1]);
  const west = parseNumber(value[2]);
  const east = parseNumber(value[3]);
  if (
    south === null ||
    north === null ||
    west === null ||
    east === null ||
    south >= north ||
    west >= east
  ) {
    return null;
  }

  return { minLng: west, minLat: south, maxLng: east, maxLat: north };
}

/**
 * Convert one Nominatim search hit to the small shape the web app needs. The
 * exported function is pure so the parsing rules can be unit tested.
 */
export function normalizeNominatimResult(
  raw: NominatimResult,
): GeocodeResult | null {
  const latitude = parseNumber(raw.lat);
  const longitude = parseNumber(raw.lon);
  if (latitude === null || longitude === null) return null;

  const displayName = raw.display_name?.trim() ?? "";
  const name =
    raw.name?.trim() ||
    displayName.split(",")[0]?.trim() ||
    "Unknown place";

  const id =
    raw.osm_type && raw.osm_id !== undefined
      ? `${raw.osm_type}/${raw.osm_id}`
      : `place/${raw.place_id ?? `${latitude},${longitude}`}`;

  return {
    id,
    name,
    label: displayName || name,
    category: raw.type ?? raw.class ?? null,
    latitude,
    longitude,
    bbox: parseBbox(raw.boundingbox),
  };
}

export function normalizeNominatimResults(
  raw: unknown,
): GeocodeResult[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) =>
      entry && typeof entry === "object"
        ? normalizeNominatimResult(entry as NominatimResult)
        : null,
    )
    .filter((entry): entry is GeocodeResult => entry !== null);
}

function readCache(key: string): GeocodeResult[] | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.results;
}

function writeCache(key: string, results: GeocodeResult[]): void {
  if (cache.size >= GEOCODE_CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }

  cache.set(key, {
    expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
    results,
  });
}

async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  const delay = NOMINATIM_MIN_INTERVAL_MS - elapsed;

  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  lastRequestAt = Date.now();
}

async function fetchNominatim(
  query: string,
  limit: number,
): Promise<GeocodeResult[]> {
  await waitForRateLimit();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("accept-language", "en");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": NOMINATIM_USER_AGENT,
      },
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
    });
  } catch (error) {
    throw new GeocodeError(
      error instanceof Error && error.name === "TimeoutError"
        ? "Place search timed out"
        : "Place search is unavailable right now",
    );
  }

  if (!response.ok) {
    throw new GeocodeError(
      `Place search failed with status ${response.status}`,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GeocodeError("Place search returned an invalid response");
  }

  return normalizeNominatimResults(body).slice(0, limit);
}

/**
 * Search for an address, city, neighbourhood, or landmark. Searches are
 * explicit user actions, not autocomplete, so public Nominatim's one-request-
 * per-second policy is respected.
 */
export async function searchPlaces(
  query: string,
  limit: number,
): Promise<GeocodeResult[]> {
  const normalizedQuery = query.trim();
  const key = `${normalizedQuery.toLocaleLowerCase()}:${limit}`;
  const cached = readCache(key);
  if (cached) return cached;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = fetchNominatim(normalizedQuery, limit)
    .then((results) => {
      writeCache(key, results);
      return results;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}
