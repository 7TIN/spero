import type { BusinessPlaceType, PoiCategory } from "@spero/shared";

/** Optional fields filled from the provider when the source data has them. */
export interface PlaceDetails {
  rawCategory: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
}

/**
 * A POI from any upstream provider, normalised for scoring and caching.
 * `osmId` is provider-scoped (for example `node/123` or `geoapify/abc`).
 */
export interface SourcePoi extends PlaceDetails {
  osmId: string;
  category: PoiCategory;
  name: string | null;
  lng: number;
  lat: number;
}

/** A competitor place fetched for one business type. */
export interface SourcePlace extends PlaceDetails {
  placeId: string;
  type: BusinessPlaceType;
  name: string | null;
  lng: number;
  lat: number;
}

/** Raised by a POI provider when it cannot serve a bbox. */
export class PoiSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PoiSourceError";
  }
}
