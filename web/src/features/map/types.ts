import type { Bbox } from "@spero/shared";

export interface MapViewport {
  bbox: Bbox | null;
  zoom: number;
}

/** A hot-zone cell picked on the map, with the centre used for its score. */
export interface SelectedCell {
  centerLng: number;
  centerLat: number;
  score: number;
}
