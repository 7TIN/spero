import type { PoiCategory } from "@spero/shared";

/**
 * How strongly each POI category attracts crowd.
 * Higher weight means a bigger contribution to a cell's hot zone score.
 */
export const CATEGORY_WEIGHTS: Record<PoiCategory, number> = {
  transport: 9,
  hospital: 9,
  college: 9,
  market: 8,
  school: 7,
  office: 6,
  entertainment: 6,
  hotel: 5,
  worship: 5,
  food: 3,
};
