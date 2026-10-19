import type { Bbox, PoiCategory } from "@spero/shared";
import {
  OVERPASS_MAX_ATTEMPTS_PER_URL,
  OVERPASS_PROBE_TIMEOUT_MS,
  OVERPASS_QUERY_TIMEOUT_S,
  OVERPASS_REQUEST_TIMEOUT_MS,
  OVERPASS_RETRY_BASE_DELAY_MS,
  OVERPASS_URLS,
  OVERPASS_USER_AGENT,
} from "../config/overpass";

export interface OverpassPoi {
  osmId: string;
  category: PoiCategory;
  name: string | null;
  lng: number;
  lat: number;
}

/** Raised when every configured Overpass endpoint fails. */
export class OverpassError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OverpassError";
  }
}

/**
 * Tag selectors sent to Overpass. Kept as a regex union per key so a full tile
 * query stays small. The definitive category split happens in `categorize`,
 * which mirrors `scripts/pois.lua`.
 */
const TAG_FILTERS = [
  '["amenity"~"^(college|university|school|hospital|clinic|bus_station|marketplace|place_of_worship|bank|townhall|cinema|theatre|restaurant|cafe|fast_food)$"]',
  '["railway"="station"]',
  '["public_transport"="station"]',
  '["shop"~"^(mall|supermarket)$"]',
  '["tourism"~"^(hotel|guest_house)$"]',
  '["office"="government"]',
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
  const area = bboxClause(bbox);
  const lines = [`[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];`, "("];

  for (const filter of TAG_FILTERS) {
    lines.push(`  nwr${filter}${area};`);
  }

  // `out tags center` returns tags plus a centroid for ways and relations.
  lines.push(");", "out tags center;");
  return lines.join("\n");
}

function parseElements(response: OverpassResponse): OverpassPoi[] {
  const pois = new Map<string, OverpassPoi>();

  for (const element of response.elements ?? []) {
    if (!element.tags) continue;

    const category = categorize(element.tags);
    if (!category) continue;

    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (lat === undefined || lng === undefined) continue;

    const osmId = `${element.type}/${element.id}`;
    pois.set(osmId, {
      osmId,
      category,
      name: element.tags.name ?? null,
      lng,
      lat,
    });
  }

  return [...pois.values()];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestOverpass(query: string): Promise<OverpassResponse> {
  let lastError: unknown;

  for (const url of OVERPASS_URLS) {
    for (let attempt = 1; attempt <= OVERPASS_MAX_ATTEMPTS_PER_URL; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": OVERPASS_USER_AGENT,
          },
          body: new URLSearchParams({ data: query }).toString(),
          signal: AbortSignal.timeout(OVERPASS_REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          throw new Error(`Overpass responded with ${response.status}`);
        }

        return (await response.json()) as OverpassResponse;
      } catch (error) {
        lastError = error;
        console.warn(
          `Overpass request to ${url} failed (attempt ${attempt}/${OVERPASS_MAX_ATTEMPTS_PER_URL}):`,
          error instanceof Error ? error.message : error,
        );

        if (attempt < OVERPASS_MAX_ATTEMPTS_PER_URL) {
          await sleep(OVERPASS_RETRY_BASE_DELAY_MS * attempt);
        }
      }
    }
  }

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
