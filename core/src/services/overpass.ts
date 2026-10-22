import type { Bbox, PoiCategory } from "@spero/shared";
import type { BusinessTypeSource } from "../config/business-types";
import {
  OVERPASS_COOLDOWN_MS,
  OVERPASS_ENDPOINT_RETRY_DELAY_MS,
  OVERPASS_ENDPOINT_RETRY_JITTER_MS,
  OVERPASS_MIN_REQUEST_GAP_MS,
  OVERPASS_PROBE_TIMEOUT_MS,
  OVERPASS_QUERY_TIMEOUT_S,
  OVERPASS_REQUEST_TIMEOUT_MS,
  OVERPASS_URLS,
  OVERPASS_USER_AGENT,
} from "../config/overpass";
import { matchesPlaceTerms } from "../lib/place-match";
import type { PlaceDetails, SourcePlace, SourcePoi } from "./poi-types";

/** Kept as an alias so existing imports keep reading naturally. */
export type OverpassPoi = SourcePoi;

/** Raised when every configured Overpass endpoint fails. */
export class OverpassError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverpassError";
  }
}

class OverpassHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Overpass responded with ${status}`);
    this.name = "OverpassHttpError";
    this.status = status;
  }
}

/**
 * One selector for the whole request. The key regex plus value regex can match
 * a few false positives (for example `shop=station`), but `categorize` drops
 * anything that is not a real crowd category, so the query stays cheap.
 */
const KEY_PATTERN =
  "^(amenity|shop|railway|tourism|office|public_transport)$";

const VALUE_PATTERN =
  "^(college|university|school|hospital|clinic|bus_station|marketplace|place_of_worship|bank|townhall|cinema|theatre|restaurant|cafe|fast_food|station|mall|supermarket|hotel|guest_house|government)$";

/** Business-like tags used for broad custom-business searches. */
const CUSTOM_NAME_KEYS = [
  "shop",
  "amenity",
  "office",
  "tourism",
  "leisure",
  "healthcare",
  "craft",
  "club",
];

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

function firstValue(
  ...values: Array<string | undefined | null>
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function tagValue(
  tags: Record<string, string>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return value;
  }
  return null;
}

function pickRawCategory(tags: Record<string, string>): string | null {
  const keys = [
    "amenity",
    "shop",
    "leisure",
    "tourism",
    "office",
    "public_transport",
    "railway",
  ];

  for (const key of keys) {
    const value = tags[key]?.trim();
    if (value) return `${key}=${value}`;
  }

  return null;
}

/** Business tags that can describe a custom category search. */
function customTagText(tags: Record<string, string>): string {
  return CUSTOM_NAME_KEYS.map((key) => tags[key])
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function pickAddress(tags: Record<string, string>): string | null {
  const full = tags["addr:full"]?.trim();
  if (full) return full;

  const street = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ")
    .trim();
  const parts = [
    street,
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:postcode"],
    tags["addr:state"],
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

function detailsFromTags(tags: Record<string, string>): PlaceDetails {
  return {
    rawCategory: pickRawCategory(tags),
    address: pickAddress(tags),
    phone: tagValue(tags, [
      "phone",
      "contact:phone",
      "contact:mobile",
      "mobile",
    ]),
    website: tagValue(tags, ["website", "contact:website", "url"]),
    openingHours: tagValue(tags, ["opening_hours"]),
  };
}

/** Map OSM tags to a single crowd category. First match wins. */
function categorize(tags: Record<string, string>): PoiCategory | null {
  const amenity = tags.amenity;
  const railway = tags.railway;
  const shop = tags.shop;
  const tourism = tags.tourism;
  const office = tags.office;
  const publicTransport = tags.public_transport;

  if (amenity === "college" || amenity === "university") return "college";
  if (amenity === "school") return "school";
  if (amenity === "hospital" || amenity === "clinic") return "hospital";
  if (
    amenity === "bus_station" ||
    railway === "station" ||
    publicTransport === "station"
  ) {
    return "transport";
  }
  if (
    amenity === "marketplace" ||
    shop === "mall" ||
    shop === "supermarket"
  ) {
    return "market";
  }
  if (amenity === "place_of_worship") return "worship";
  if (tourism === "hotel" || tourism === "guest_house") return "hotel";
  if (
    office === "government" ||
    amenity === "bank" ||
    amenity === "townhall"
  ) {
    return "office";
  }
  if (amenity === "cinema" || amenity === "theatre") return "entertainment";
  if (
    amenity === "restaurant" ||
    amenity === "cafe" ||
    amenity === "fast_food"
  ) {
    return "food";
  }

  return null;
}

/** Overpass bboxes are (south, west, north, east), the reverse of GeoJSON. */
function bboxClause(bbox: Bbox): string {
  return `(${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng})`;
}

function buildQuery(bbox: Bbox): string {
  return [
    `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];`,
    `nwr[~"${KEY_PATTERN}"~"${VALUE_PATTERN}"]${bboxClause(bbox)};`,
    // `out tags center` returns tags plus a centroid for ways and relations.
    "out tags center;",
  ].join("\n");
}

function buildTypeQuery(bbox: Bbox, source: BusinessTypeSource): string {
  let selectors: string;

  if (source.matchTerms?.length) {
    // Fetch every business-like place in the area and filter locally. Searching
    // only for names that contain the label misses category matches such as
    // "spa" being tagged as leisure=spa under a different business name.
    selectors = CUSTOM_NAME_KEYS.map(
      (key) => `nwr["${key}"]${bboxClause(bbox)};`,
    ).join("\n");
  } else {
    selectors = source.osmTags
      .map(({ key, value }) => `nwr["${key}"="${value}"]${bboxClause(bbox)};`)
      .join("\n");
  }

  return [
    `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];`,
    selectors,
    "out tags center;",
  ].join("\n");
}

function coordinates(
  element: OverpassElement,
): [number, number] | null {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (lat === undefined || lng === undefined) return null;
  return [lng, lat];
}

function parseElements(response: OverpassResponse): OverpassPoi[] {
  const pois = new Map<string, OverpassPoi>();

  for (const element of response.elements ?? []) {
    if (!element.tags) continue;

    const category = categorize(element.tags);
    if (!category) continue;

    const point = coordinates(element);
    if (!point) continue;

    const [lng, lat] = point;
    const osmId = `${element.type}/${element.id}`;
    pois.set(osmId, {
      osmId,
      category,
      name: firstValue(element.tags.name, element.tags["name:en"]),
      lng,
      lat,
      ...detailsFromTags(element.tags),
    });
  }

  return [...pois.values()];
}

function parsePlaceElements(
  response: OverpassResponse,
  source: BusinessTypeSource,
): SourcePlace[] {
  const places = new Map<string, SourcePlace>();

  for (const element of response.elements ?? []) {
    if (!element.tags) continue;

    const name = firstValue(element.tags.name, element.tags["name:en"]);
    const matches = source.matchTerms
      ? matchesPlaceTerms(
          name,
          [customTagText(element.tags)],
          source.matchTerms,
        )
      : source.osmTags.some(
          (tag) => element.tags?.[tag.key] === tag.value,
        );
    if (!matches) continue;

    const point = coordinates(element);
    if (!point) continue;

    const [lng, lat] = point;
    const placeId = `${element.type}/${element.id}`;
    places.set(placeId, {
      placeId,
      type: source.id,
      name,
      lng,
      lat,
      ...detailsFromTags(element.tags),
    });
  }

  return [...places.values()];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serialises every Overpass call behind a single queue with a minimum gap, so
 * several tiles/panels cannot fire at once.
 */
let queueTail: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = queueTail.then(async () => {
    const wait = lastRequestAt + OVERPASS_MIN_REQUEST_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return task();
  });

  queueTail = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

let cooldownUntil = 0;

async function requestOverpass(query: string): Promise<OverpassResponse> {
  const cooldownRemaining = cooldownUntil - Date.now();
  if (cooldownRemaining > 0) {
    throw new OverpassError(
      `Overpass is backing off for another ${Math.ceil(cooldownRemaining / 1000)}s`,
    );
  }

  let lastError: unknown;

  for (let index = 0; index < OVERPASS_URLS.length; index += 1) {
    const url = OVERPASS_URLS[index];
    if (!url) continue;

    try {
      const response = await schedule(() =>
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": OVERPASS_USER_AGENT,
          },
          body: new URLSearchParams({ data: query }).toString(),
          signal: AbortSignal.timeout(OVERPASS_REQUEST_TIMEOUT_MS),
        }),
      );

      if (!response.ok) {
        throw new OverpassHttpError(response.status);
      }

      return (await response.json()) as OverpassResponse;
    } catch (error) {
      lastError = error;
      console.warn(
        `Overpass request to ${url} failed:`,
        error instanceof Error ? error.message : error,
      );

      if (index < OVERPASS_URLS.length - 1) {
        const retryable =
          error instanceof OverpassHttpError &&
          (error.status === 429 || error.status >= 500);
        const delay =
          (retryable ? OVERPASS_ENDPOINT_RETRY_DELAY_MS : 250) +
          Math.random() * OVERPASS_ENDPOINT_RETRY_JITTER_MS;
        await sleep(delay);
      }
    }
  }

  cooldownUntil = Date.now() + OVERPASS_COOLDOWN_MS;
  throw new OverpassError(
    `Could not reach the Overpass API. ${
      lastError instanceof Error ? lastError.message : "Unknown error"
    }`,
  );
}

/** Fetch and categorize every crowd POI inside a bbox. */
export async function fetchPoisForBbox(bbox: Bbox): Promise<OverpassPoi[]> {
  const response = await requestOverpass(buildQuery(bbox));
  return parseElements(response);
}

/** Fetch places of one business type for the competitor list. */
export async function fetchPlacesForType(
  bbox: Bbox,
  source: BusinessTypeSource,
): Promise<SourcePlace[]> {
  const response = await requestOverpass(buildTypeQuery(bbox, source));
  return parsePlaceElements(response, source);
}

/** Lightweight reachability check used by `/health`. */
export async function probeOverpass(): Promise<boolean> {
  const url = OVERPASS_URLS[0];
  if (!url) return false;

  const statusUrl = url.replace(/\/interpreter\/?$/, "/status");

  try {
    const response = await fetch(statusUrl, {
      headers: { "User-Agent": OVERPASS_USER_AGENT },
      signal: AbortSignal.timeout(OVERPASS_PROBE_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}
