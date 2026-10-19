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

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface HotzoneBreakdownItem {
  category: PoiCategory;
  count: number;
}

export interface HotzoneProperties {
  score: number;
  breakdown: HotzoneBreakdownItem[];
}

export interface PoiProperties {
  name: string | null;
  category: PoiCategory;
}

export type HotzoneFeature = Feature<Polygon, HotzoneProperties>;
export type HotzoneFeatureCollection = FeatureCollection<
  Polygon,
  HotzoneProperties
>;

export type PoiFeature = Feature<Point, PoiProperties>;
export type PoiFeatureCollection = FeatureCollection<Point, PoiProperties>;
