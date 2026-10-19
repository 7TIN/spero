import type { Bbox, PoiCategory } from "@spero/shared";
import {
  GEOAPIFY_API_KEY,
  GEOAPIFY_MAX_PAGES,
  GEOAPIFY_PAGE_SIZE,
  GEOAPIFY_REQUEST_TIMEOUT_MS,
  GEOAPIFY_URL,
} from "../config/poi";
import type { SourcePoi } from "./poi-types";

/** Raised when Geoapify cannot serve a bbox. */
export class GeoapifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeoapifyError";
  }
}

/**
 * Geoapify category keys per crowd category, in the same first-match order used
 * by the Overpass mapper. Parent keys also match their children.
 */
const CATEGORY_ORDER: Array<{ category: PoiCategory; keys: string[] }> = [
  { category: "college", keys: ["education.college", "education.university"] },
  { category: "school", keys: ["education.school"] },
  {
    category: "hospital",
    keys: ["healthcare.hospital", "healthcare.clinic_or_praxis"],
  },
  { category: "transport", keys: ["public_transport"] },
  {
    category: "market",
    keys: [
      "commercial.marketplace",
      "commercial.shopping_mall",
      "commercial.supermarket",
    ],
  },
  {
    category: "worship",
    keys: ["religion.place_of_worship"],
  },
  {
    category: "hotel",
    keys: ["accommodation.hotel", "accommodation.guest_house"],
  },
  {
    category: "office",
    keys: [
      "office.government",
      "service.financial.bank",
      "tourism.sights.city_hall",
    ],
  },
  {
    category: "entertainment",
    keys: ["entertainment.cinema", "entertainment.culture.theatre"],
  },
  {
    category: "food",
    keys: [
      "catering.restaurant",
      "catering.cafe",
      "catering.fast_food",
    ],
  },
];

/** Everything we ask Geoapify for, de-duplicated. */
const REQUEST_CATEGORIES = [
  ...new Set(CATEGORY_ORDER.flatMap((entry) => entry.keys)),
].join(",");

interface GeoapifyFeature {
  geometry?: { type?: string; coordinates?: number[] };
  properties?: {
    place_id?: string;
    name?: string;
    categories?: string[];
  };
}

interface GeoapifyResponse {
  features?: GeoapifyFeature[];
}

function categorize(categories: string[] | undefined): PoiCategory | null {
  if (!categories || categories.length === 0) return null;

  for (const entry of CATEGORY_ORDER) {
    for (const key of entry.keys) {
      if (
        categories.some(
          (candidate) =>
            candidate === key || candidate.startsWith(`${key}.`),
        )
      ) {
        return entry.category;
      }
    }
  }

  return null;
}

function buildUrl(bbox: Bbox, offset: number): string {
  const params = new URLSearchParams({
    categories: REQUEST_CATEGORIES,
    filter: `rect:${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`,
    limit: String(GEOAPIFY_PAGE_SIZE),
    offset: String(offset),
    apiKey: GEOAPIFY_API_KEY,
  });

  return `${GEOAPIFY_URL}?${params.toString()}`;
}

function statusError(status: number): GeoapifyError {
  if (status === 401 || status === 403) {
    return new GeoapifyError(
      "Geoapify rejected the API key. Set GEOAPIFY_API_KEY in core/.env (or switch POI_PROVIDER=overpass).",
    );
  }
  if (status === 429) {
    return new GeoapifyError(
      "Geoapify rate limit reached. Wait a moment, or let the cached tiles serve the map.",
    );
  }
  return new GeoapifyError(`Geoapify responded with HTTP ${status}.`);
}

async function requestPage(
  bbox: Bbox,
  offset: number,
): Promise<GeoapifyResponse> {
  let response: Response;

  try {
    response = await fetch(buildUrl(bbox, offset), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(GEOAPIFY_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new GeoapifyError(
      `Could not reach Geoapify. ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }

  if (!response.ok) {
    throw statusError(response.status);
  }

  return (await response.json()) as GeoapifyResponse;
}

/** Fetch and categorize every crowd POI inside a bbox. */
export async function fetchPoisForBbox(bbox: Bbox): Promise<SourcePoi[]> {
  if (!GEOAPIFY_API_KEY) {
    throw new GeoapifyError(
      "GEOAPIFY_API_KEY is not set. Add it to core/.env, or set POI_PROVIDER=overpass.",
    );
  }

  const pois = new Map<string, SourcePoi>();

  for (let page = 0; page < GEOAPIFY_MAX_PAGES; page += 1) {
    const response = await requestPage(bbox, page * GEOAPIFY_PAGE_SIZE);
    const features = response.features ?? [];

    for (const feature of features) {
      const coordinates = feature.geometry?.coordinates;
      if (!coordinates || coordinates.length < 2) continue;

      const [lng, lat] = coordinates;
      if (lng === undefined || lat === undefined) continue;

      const category = categorize(feature.properties?.categories);
      if (!category) continue;

      const placeId = feature.properties?.place_id;
      const osmId = placeId
        ? `geoapify/${placeId}`
        : `geoapify/${lng.toFixed(6)},${lat.toFixed(6)}`;

      pois.set(osmId, {
        osmId,
        category,
        name: feature.properties?.name ?? null,
        lng,
        lat,
      });
    }

    if (features.length < GEOAPIFY_PAGE_SIZE) break;
  }

  return [...pois.values()];
}
