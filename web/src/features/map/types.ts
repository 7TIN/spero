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
  /** Geographic bounds of the cell, used for the persistent dotted outline. */
  bounds: Bbox;
}

/**
 * Normal keeps the map as it is. Selection keeps a clicked cell outlined so it
 * stays recognisable while the grid around it is re-scored.
 */
export type SelectionMode = "normal" | "selection";
