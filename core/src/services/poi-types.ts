import type { PoiCategory } from "@spero/shared";

/**
 * A POI from any upstream provider, normalised for scoring and caching.
 * `osmId` is provider-scoped (for example `node/123` or `geoapify/abc`).
 */
export interface SourcePoi {
  osmId: string;
  category: PoiCategory;
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
