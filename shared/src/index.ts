import type { Feature, FeatureCollection, Point, Polygon } from "geojson";

export const POI_CATEGORIES = [
  "college",
  "school",
  "hospital",
  "transport",
  "market",
  "worship",
  "hotel",
  "office",
  "entertainment",
  "food",
] as const;

export type PoiCategory = (typeof POI_CATEGORIES)[number];

/** Basemaps the map and the agent can switch between. */
export const BASEMAP_IDS = ["light", "dark", "osm"] as const;
export type BasemapId = (typeof BASEMAP_IDS)[number];

/** Selection keeps a clicked cell outlined; normal clears it when the map moves. */
export const SELECTION_MODES = ["normal", "selection"] as const;
export type SelectionMode = (typeof SELECTION_MODES)[number];

/**
 * Business types a user can compare against the selected area. The labels live
 * here so the web app and the provider mapping in core stay in sync.
 */
export const BUSINESS_TYPE_OPTIONS = [
  { id: "cafe", label: "Café", plural: "cafés" },
  { id: "restaurant", label: "Restaurant", plural: "restaurants" },
  { id: "pharmacy", label: "Pharmacy", plural: "pharmacies" },
  { id: "gym", label: "Gym", plural: "gyms" },
  { id: "salon", label: "Salon", plural: "salons" },
  { id: "bakery", label: "Bakery", plural: "bakeries" },
  { id: "grocery", label: "Grocery store", plural: "grocery stores" },
  { id: "clothing", label: "Clothing store", plural: "clothing stores" },
  {
    id: "electronics",
    label: "Electronics store",
    plural: "electronics stores",
  },
  { id: "bank", label: "Bank", plural: "banks" },
] as const;

export type BusinessTypeId = (typeof BUSINESS_TYPE_OPTIONS)[number]["id"];

/** The extra select value that opens the user-provided business field. */
export const CUSTOM_BUSINESS_TYPE = "custom" as const;
export const CUSTOM_BUSINESS_LABEL_MAX_LENGTH = 60;

/** A preset business id, or the custom selector. */
export type BusinessTypeKey = BusinessTypeId | typeof CUSTOM_BUSINESS_TYPE;

/** A custom provider source is scoped by the user's label. */
export type BusinessPlaceType = BusinessTypeId | `custom:${string}`;

export interface BusinessTypeOption {
  id: BusinessTypeKey;
  label: string;
  plural: string;
}

/** The value sent to the places API for a preset or custom comparison. */
export interface BusinessSelection {
  type: BusinessTypeKey;
  /** Required when `type` is custom. */
  label?: string;
}

export function isBusinessTypeId(value: string): value is BusinessTypeId {
  return BUSINESS_TYPE_OPTIONS.some((option) => option.id === value);
}

export function isBusinessTypeKey(value: string): value is BusinessTypeKey {
  return value === CUSTOM_BUSINESS_TYPE || isBusinessTypeId(value);
}

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** One address or place search hit from the geocoder. */
export interface GeocodeResult {
  id: string;
  /** Short name, usually the first part of the display label. */
  name: string;
  /** Full address or place label. */
  label: string;
  /** Nominatim's place type, e.g. "city", "suburb", or "house". */
  category: string | null;
  latitude: number;
  longitude: number;
  /** Optional bounds so the map can fit a city or neighbourhood. */
  bbox: Bbox | null;
}

export interface GeocodeResponse {
  results: GeocodeResult[];
}

/** Snapshot of the map controls sent with an agent request. */
export interface AgentContext {
  bbox: Bbox | null;
  zoom: number;
  selectedCell: {
    centerLng: number;
    centerLat: number;
    score: number;
  } | null;
  businessType: BusinessTypeId | null;
  customBusinessLabel: string | null;
  cellSize: number;
  radius: number;
  enabledCategories: PoiCategory[];
  basemap: BasemapId;
  mode: SelectionMode;
}

export interface AgentLocation {
  /** The place name the model asked to geocode, if any. */
  query: string | null;
  useCurrentView: boolean;
  /** Resolved place, or null when the query was not a named place or not found. */
  result: GeocodeResult | null;
}

/** Validated controls the web app should apply after an agent response. */
export interface AgentActions {
  businessType: BusinessTypeKey | null;
  customBusinessLabel: string | null;
  categories: PoiCategory[] | null;
  cellSizeMeters: number | null;
  radiusMeters: number | null;
  basemap: BasemapId | null;
  mode: SelectionMode | null;
  clearSelection: boolean;
}

export type AgentSource = "gemini" | "quick";

export interface AgentResponse {
  message: string;
  source: AgentSource;
  location: AgentLocation;
  actions: AgentActions;
}

/** Optional place metadata kept alongside every cached POI/competitor. */
export interface PlaceDetails {
  rawCategory: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
}

export interface HotzoneBreakdownItem {
  category: PoiCategory;
  count: number;
}

export interface HotzoneProperties {
  score: number;
  breakdown: HotzoneBreakdownItem[];
}

export interface PoiProperties extends PlaceDetails {
  name: string | null;
  category: PoiCategory;
}

export interface PlaceProperties extends PlaceDetails {
  /** Provider-scoped id, stable enough to highlight a marker's card. */
  id: string;
  name: string | null;
  type: BusinessPlaceType;
}

export type HotzoneFeature = Feature<Polygon, HotzoneProperties>;
export type HotzoneFeatureCollection = FeatureCollection<
  Polygon,
  HotzoneProperties
>;

export type PoiFeature = Feature<Point, PoiProperties>;
export type PoiFeatureCollection = FeatureCollection<Point, PoiProperties>;

export type PlaceFeature = Feature<Point, PlaceProperties>;
export type PlaceFeatureCollection = FeatureCollection<Point, PlaceProperties>;
