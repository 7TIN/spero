import type { Bbox, BusinessTypeId, PoiCategory } from "@spero/shared";
import { getBusinessType } from "../config/business-types";
import {
  GEOAPIFY_API_KEY,
  GEOAPIFY_MAX_PAGES,
  GEOAPIFY_PAGE_SIZE,
  GEOAPIFY_REQUEST_TIMEOUT_MS,
  GEOAPIFY_URL,
} from "../config/poi";
import type { PlaceDetails, SourcePlace, SourcePoi } from "./poi-types";
import { recordGeoapifyCredits } from "./tile-cache";

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

/**
 * Geoapify can return conditions (for example `wheelchair.yes`) alongside real
 * categories. Those are not useful as a raw category label.
 */
const CONDITION_TOP_LEVELS = new Set([
  "access",
  "air_conditioning",
  "changing_table",
  "delivery",
  "dogs",
  "fee",
  "internet_access",
  "outdoor_seating",
  "payment",
  "reservation",
  "smoking",
  "swimming_pool",
  "takeaway",
  "toilets",
  "wheelchair",
]);

interface GeoapifyProperties {
  place_id?: string;
  name?: string;
  categories?: string[];
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  postcode?: string;
  state?: string;
  country?: string;
  website?: string;
  phone?: string;
  opening_hours?: string;
  datasource?: { raw?: Record<string, unknown> };
}

interface GeoapifyFeature {
  geometry?: { type?: string; coordinates?: number[] };
  properties?: GeoapifyProperties;
}

interface GeoapifyResponse {
  features?: GeoapifyFeature[];
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

function rawTag(
  raw: Record<string, unknown> | undefined,
  keys: string[],
): string | null {
  if (!raw) return null;
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function pickRawCategory(categories: string[] | undefined): string | null {
  if (!categories) return null;

  const candidates = categories.filter((category) => {
    const topLevel = category.split(".")[0] ?? "";
    return !CONDITION_TOP_LEVELS.has(topLevel);
  });

  return candidates.at(-1) ?? null;
}

function pickAddress(properties: GeoapifyProperties): string | null {
  const line2 = properties.address_line2?.trim();
  if (line2) return line2;

  const street = [properties.housenumber, properties.street]
    .filter(Boolean)
    .join(" ")
    .trim();
  const parts = [
    street,
    properties.city,
    properties.postcode,
    properties.state,
    properties.country,
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(", ");
  return properties.formatted?.trim() || null;
}

function detailsFromProperties(
  properties: GeoapifyProperties,
): PlaceDetails {
  const raw = properties.datasource?.raw;

  return {
    rawCategory: pickRawCategory(properties.categories),
    address: pickAddress(properties),
    phone: firstValue(
      properties.phone,
      rawTag(raw, ["phone", "contact:phone", "contact:mobile", "mobile"]),
    ),
    website: firstValue(
      properties.website,
      rawTag(raw, ["website", "contact:website", "url"]),
    ),
    openingHours: firstValue(
      properties.opening_hours,
      rawTag(raw, ["opening_hours"]),
    ),
  };
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

function buildUrl(
  bbox: Bbox,
  categories: string,
  offset: number,
): string {
  const params = new URLSearchParams({
    categories,
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
  categories: string,
  offset: number,
): Promise<GeoapifyResponse> {
  let response: Response;

  try {
    response = await fetch(buildUrl(bbox, categories, offset), {
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

  const body = (await response.json()) as GeoapifyResponse;
  const returned = body.features?.length ?? 0;

  // Geoapify counts one request plus one credit per 20 returned places.
  try {
    recordGeoapifyCredits(1 + Math.ceil(returned / 20));
  } catch (error) {
    // Usage tracking must never fail a map request.
    console.warn(
      "Could not record Geoapify usage:",
      error instanceof Error ? error.message : error,
    );
  }

  return body;
}

function requireApiKey(): void {
  if (!GEOAPIFY_API_KEY) {
    throw new GeoapifyError(
      "GEOAPIFY_API_KEY is not set. Add it to core/.env, or set POI_PROVIDER=overpass.",
    );
  }
}

function coordinates(
  feature: GeoapifyFeature,
): [number, number] | null {
  const values = feature.geometry?.coordinates;
  if (!values || values.length < 2) return null;

  const [lng, lat] = values;
  if (lng === undefined || lat === undefined) return null;
  return [lng, lat];
}

/** Fetch and categorize every crowd POI inside a bbox. */
export async function fetchPoisForBbox(bbox: Bbox): Promise<SourcePoi[]> {
  requireApiKey();

  const pois = new Map<string, SourcePoi>();

  for (let page = 0; page < GEOAPIFY_MAX_PAGES; page += 1) {
    const response = await requestPage(
      bbox,
      REQUEST_CATEGORIES,
      page * GEOAPIFY_PAGE_SIZE,
    );
    const features = response.features ?? [];

    for (const feature of features) {
      const point = coordinates(feature);
      if (!point) continue;

      const [lng, lat] = point;
      const properties = feature.properties ?? {};
      const category = categorize(properties.categories);
      if (!category) continue;

      const placeId = properties.place_id;
      const osmId = placeId
        ? `geoapify/${placeId}`
        : `geoapify/${lng.toFixed(6)},${lat.toFixed(6)}`;

      pois.set(osmId, {
        osmId,
        category,
        name: firstValue(properties.name),
        lng,
        lat,
        ...detailsFromProperties(properties),
      });
    }

    if (features.length < GEOAPIFY_PAGE_SIZE) break;
  }

  return [...pois.values()];
}

/** Fetch places of one business type for the competitor list. */
export async function fetchPlacesForType(
  bbox: Bbox,
  type: BusinessTypeId,
): Promise<SourcePlace[]> {
  requireApiKey();

  const source = getBusinessType(type);
  const categories = source.geoapifyCategories.join(",");
  const places = new Map<string, SourcePlace>();

  for (let page = 0; page < GEOAPIFY_MAX_PAGES; page += 1) {
    const response = await requestPage(
      bbox,
      categories,
      page * GEOAPIFY_PAGE_SIZE,
    );
    const features = response.features ?? [];

    for (const feature of features) {
      const point = coordinates(feature);
      if (!point) continue;

      const [lng, lat] = point;
      const properties = feature.properties ?? {};
      const placeId = properties.place_id
        ? `geoapify/${properties.place_id}`
        : `geoapify/${lng.toFixed(6)},${lat.toFixed(6)}`;

      places.set(placeId, {
        placeId,
        type,
        name: firstValue(properties.name),
        lng,
        lat,
        ...detailsFromProperties(properties),
      });
    }

    if (features.length < GEOAPIFY_PAGE_SIZE) break;
  }

  return [...places.values()];
}
