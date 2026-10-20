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
 * A request to move the map. The incrementing id lets the same place be
 * selected twice without the view effect treating it as a no-op.
 */
export interface FlyToTarget {
  id: number;
  latitude: number;
  longitude: number;
  bbox: Bbox | null;
  label: string;
}

/** A saved cell, kept across map moves and reloads. */
export interface PinnedCell {
  /** Stable bounds-derived key, also used to detect duplicate pins. */
  id: string;
  cell: SelectedCell;
  pinnedAt: number;
}

/**
 * Normal keeps the map as it is. Selection keeps a clicked cell outlined so it
 * stays recognisable while the grid around it is re-scored.
 */
export type SelectionMode = "normal" | "selection";
