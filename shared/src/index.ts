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

export function isBusinessTypeId(value: string): value is BusinessTypeId {
  return BUSINESS_TYPE_OPTIONS.some((option) => option.id === value);
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
  type: BusinessTypeId;
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
