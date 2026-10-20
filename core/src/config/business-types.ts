import {
  BUSINESS_TYPE_OPTIONS,
  type BusinessPlaceType,
  type BusinessTypeId,
} from "@spero/shared";

export interface BusinessTypeSource {
  id: BusinessPlaceType;
  label: string;
  plural: string;
  /** Geoapify category keys. Parent keys also match their children. */
  geoapifyCategories: string[];
  /** Raw OSM tags used by the Overpass fallback. */
  osmTags: Array<{ key: string; value: string }>;
  /** Free-text fallback used when no category mapping matches a custom type. */
  nameQuery?: string;
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

interface CustomBusinessMapping {
  aliases: string[];
  geoapifyCategories: string[];
  osmTags: Array<{ key: string; value: string }>;
}

/**
 * Common businesses that are not in the preset list. Custom labels still work
 * without a mapping through the provider name search, but mapping the common
 * ones produces a complete category result rather than only name matches.
 */
const CUSTOM_BUSINESS_MAPPINGS: CustomBusinessMapping[] = [
  {
    aliases: ["pet store", "pet shop", "pet supplies", "pet"],
    geoapifyCategories: ["commercial.pet", "pet.shop", "pet.veterinary"],
    osmTags: [
      { key: "shop", value: "pet" },
      { key: "shop", value: "pet_grooming" },
    ],
  },
  {
    aliases: ["bookstore", "book store", "book shop", "books"],
    geoapifyCategories: ["commercial.books"],
    osmTags: [{ key: "shop", value: "books" }],
  },
  {
    aliases: ["furniture store", "furniture", "home decor"],
    geoapifyCategories: ["commercial.furniture_and_interior"],
    osmTags: [{ key: "shop", value: "furniture" }],
  },
  {
    aliases: ["hardware store", "hardware", "diy", "do it yourself"],
    geoapifyCategories: [
      "commercial.houseware_and_hardware",
      "commercial.houseware_and_hardware.hardware_and_tools",
      "commercial.houseware_and_hardware.doityourself",
    ],
    osmTags: [
      { key: "shop", value: "hardware" },
      { key: "shop", value: "doityourself" },
      { key: "shop", value: "building_materials" },
    ],
  },
  {
    aliases: ["jewelry", "jewellery", "jeweler", "jeweller"],
    geoapifyCategories: ["commercial.jewelry"],
    osmTags: [{ key: "shop", value: "jewelry" }],
  },
  {
    aliases: ["florist", "flower shop", "flowers"],
    geoapifyCategories: ["commercial.florist"],
    osmTags: [{ key: "shop", value: "florist" }],
  },
  {
    aliases: ["toy store", "toy shop", "toys"],
    geoapifyCategories: ["commercial.toy_and_game"],
    osmTags: [{ key: "shop", value: "toys" }],
  },
  {
    aliases: ["bicycle shop", "bike shop", "bicycle", "bikes"],
    geoapifyCategories: [
      "commercial.outdoor_and_sport.bicycle",
      "rental.bicycle",
    ],
    osmTags: [
      { key: "shop", value: "bicycle" },
      { key: "amenity", value: "bicycle_rental" },
    ],
  },
  {
    aliases: ["optician", "eyewear", "glasses"],
    geoapifyCategories: ["commercial.health_and_beauty.optician"],
    osmTags: [{ key: "shop", value: "optician" }],
  },
  {
    aliases: ["butcher", "meat shop"],
    geoapifyCategories: ["commercial.food_and_drink.butcher"],
    osmTags: [{ key: "shop", value: "butcher" }],
  },
  {
    aliases: ["bar", "pub"],
    geoapifyCategories: ["catering.bar", "catering.pub"],
    osmTags: [
      { key: "amenity", value: "bar" },
      { key: "amenity", value: "pub" },
    ],
  },
  {
    aliases: ["nightclub", "night club", "discotheque"],
    geoapifyCategories: ["catering.bar", "entertainment"],
    osmTags: [{ key: "amenity", value: "nightclub" }],
  },
  {
    aliases: ["dentist", "dental clinic"],
    geoapifyCategories: ["healthcare.dentist"],
    osmTags: [{ key: "amenity", value: "dentist" }],
  },
  {
    aliases: ["veterinary", "vet", "animal clinic"],
    geoapifyCategories: ["pet.veterinary"],
    osmTags: [{ key: "amenity", value: "veterinary" }],
  },
  {
    aliases: ["coworking", "co working", "coworking space"],
    geoapifyCategories: ["office.coworking"],
    osmTags: [{ key: "office", value: "coworking" }],
  },
  {
    aliases: ["laundry", "laundromat", "dry cleaning", "dry cleaner"],
    geoapifyCategories: [
      "service.cleaning.laundry",
      "service.cleaning.dry_cleaning",
    ],
    osmTags: [
      { key: "shop", value: "laundry" },
      { key: "shop", value: "dry_cleaning" },
    ],
  },
  {
    aliases: ["tailor", "tailoring", "alterations"],
    geoapifyCategories: ["service.tailor"],
    osmTags: [{ key: "shop", value: "tailor" }],
  },
  {
    aliases: ["tattoo", "tattoo studio"],
    geoapifyCategories: ["service.beauty.tattoo"],
    osmTags: [{ key: "shop", value: "tattoo" }],
  },
  {
    aliases: ["massage", "massage spa"],
    geoapifyCategories: ["service.beauty.massage"],
    osmTags: [{ key: "shop", value: "massage" }],
  },
  {
    aliases: ["car repair", "auto repair", "garage", "mechanic"],
    geoapifyCategories: ["service.vehicle.repair.car", "service.vehicle.repair"],
    osmTags: [
      { key: "shop", value: "car_repair" },
      { key: "amenity", value: "car_repair" },
    ],
  },
  {
    aliases: ["car wash", "carwash"],
    geoapifyCategories: ["service.vehicle.car_wash"],
    osmTags: [{ key: "amenity", value: "car_wash" }],
  },
  {
    aliases: ["petrol station", "gas station", "fuel station", "petrol pump"],
    geoapifyCategories: ["service.vehicle.fuel"],
    osmTags: [{ key: "amenity", value: "fuel" }],
  },
  {
    aliases: ["driving school"],
    geoapifyCategories: ["education.driving_school"],
    osmTags: [{ key: "amenity", value: "driving_school" }],
  },
  {
    aliases: ["library"],
    geoapifyCategories: ["education.library"],
    osmTags: [{ key: "amenity", value: "library" }],
  },
  {
    aliases: ["kindergarten", "preschool", "daycare"],
    geoapifyCategories: ["childcare.kindergarten"],
    osmTags: [
      { key: "amenity", value: "kindergarten" },
      { key: "amenity", value: "childcare" },
    ],
  },
  {
    aliases: ["cinema", "movie theater", "theatre"],
    geoapifyCategories: [
      "entertainment.cinema",
      "entertainment.culture.theatre",
    ],
    osmTags: [
      { key: "amenity", value: "cinema" },
      { key: "amenity", value: "theatre" },
    ],
  },
  {
    aliases: ["mall", "shopping mall"],
    geoapifyCategories: ["commercial.shopping_mall"],
    osmTags: [{ key: "shop", value: "mall" }],
  },
  {
    aliases: ["department store"],
    geoapifyCategories: ["commercial.department_store"],
    osmTags: [{ key: "shop", value: "department_store" }],
  },
];

/**
 * A broad net for labels with no category mapping. The provider's name filter
 * narrows these down to places whose names contain the user's label.
 */
const CUSTOM_FALLBACK_GEOAPIFY_CATEGORIES = [
  "commercial",
  "catering",
  "service",
  "office",
  "healthcare",
  "education",
  "entertainment",
  "tourism",
  "leisure",
  "activity",
  "pet",
  "accommodation",
];

function normalizeBusinessLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CUSTOM_BUSINESS_BY_ALIAS = new Map<
  string,
  CustomBusinessMapping
>();

for (const mapping of CUSTOM_BUSINESS_MAPPINGS) {
  for (const alias of mapping.aliases) {
    CUSTOM_BUSINESS_BY_ALIAS.set(normalizeBusinessLabel(alias), mapping);
  }
}

function customBusinessKey(label: string): `custom:${string}` {
  const normalized = label.trim().toLowerCase().replace(/\s+/g, " ");
  return `custom:${encodeURIComponent(normalized)}`;
}

/** Provider source for a user-entered business type. */
export function customBusinessSource(label: string): BusinessTypeSource {
  const trimmed = label.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) {
    throw new Error("Custom business needs at least two characters");
  }

  const mapping = CUSTOM_BUSINESS_BY_ALIAS.get(
    normalizeBusinessLabel(trimmed),
  );

  return {
    id: customBusinessKey(trimmed),
    label: trimmed,
    plural: trimmed,
    geoapifyCategories:
      mapping?.geoapifyCategories ?? CUSTOM_FALLBACK_GEOAPIFY_CATEGORIES,
    osmTags: mapping?.osmTags ?? [],
    ...(mapping ? {} : { nameQuery: trimmed }),
  };
}

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
