import {
  BUSINESS_TYPE_OPTIONS,
  type BusinessTypeId,
} from "@spero/shared";

export interface BusinessTypeSource {
  id: BusinessTypeId;
  label: string;
  plural: string;
  /** Geoapify category keys. Parent keys also match their children. */
  geoapifyCategories: string[];
  /** Raw OSM tags used by the Overpass fallback. */
  osmTags: Array<{ key: string; value: string }>;
}

type SourceMapping = Pick<BusinessTypeSource, "geoapifyCategories" | "osmTags">;

const SOURCE_MAPPINGS: Record<BusinessTypeId, SourceMapping> = {
  cafe: {
    geoapifyCategories: ["catering.cafe"],
    osmTags: [{ key: "amenity", value: "cafe" }],
  },
  restaurant: {
    geoapifyCategories: ["catering.restaurant", "catering.fast_food"],
    osmTags: [
      { key: "amenity", value: "restaurant" },
      { key: "amenity", value: "fast_food" },
    ],
  },
  pharmacy: {
    geoapifyCategories: [
      "healthcare.pharmacy",
      "commercial.health_and_beauty.pharmacy",
    ],
    osmTags: [{ key: "amenity", value: "pharmacy" }],
  },
  gym: {
    geoapifyCategories: ["sport.fitness"],
    osmTags: [
      { key: "leisure", value: "fitness_centre" },
      { key: "leisure", value: "sports_centre" },
    ],
  },
  salon: {
    geoapifyCategories: [
      "service.beauty.hairdresser",
      "service.beauty.tanning_salon",
    ],
    osmTags: [
      { key: "shop", value: "hairdresser" },
      { key: "shop", value: "beauty" },
    ],
  },
  bakery: {
    geoapifyCategories: ["commercial.food_and_drink.bakery"],
    osmTags: [{ key: "shop", value: "bakery" }],
  },
  grocery: {
    geoapifyCategories: [
      "commercial.supermarket",
      "commercial.convenience",
    ],
    osmTags: [
      { key: "shop", value: "supermarket" },
      { key: "shop", value: "convenience" },
      { key: "shop", value: "greengrocer" },
    ],
  },
  clothing: {
    geoapifyCategories: ["commercial.clothing"],
    osmTags: [{ key: "shop", value: "clothes" }],
  },
  electronics: {
    geoapifyCategories: ["commercial.elektronics"],
    osmTags: [
      { key: "shop", value: "electronics" },
      { key: "shop", value: "computer" },
      { key: "shop", value: "mobile_phone" },
    ],
  },
  bank: {
    geoapifyCategories: ["service.financial.bank"],
    osmTags: [{ key: "amenity", value: "bank" }],
  },
};

export const BUSINESS_TYPES: BusinessTypeSource[] = BUSINESS_TYPE_OPTIONS.map(
  (option) => ({
    ...option,
    ...SOURCE_MAPPINGS[option.id],
  }),
);

const BUSINESS_TYPE_BY_ID = new Map<string, BusinessTypeSource>(
  BUSINESS_TYPES.map((type) => [type.id, type]),
);

/** The provider mapping for a known business type, or null for a bad input. */
export function businessTypeSource(
  id: string,
): BusinessTypeSource | null {
  return BUSINESS_TYPE_BY_ID.get(id) ?? null;
}

/** The provider mapping for a business type. Throws for programming errors. */
export function getBusinessType(id: BusinessTypeId): BusinessTypeSource {
  const source = businessTypeSource(id);
  if (!source) throw new Error(`Unknown business type: ${id}`);
  return source;
}
