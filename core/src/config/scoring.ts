export const DEFAULT_CELL_SIZE_M = 250;
/** Finest grid the API accepts. Kept small so a fully zoomed-in view can
 *  still be scored at a useful granularity; the UI default stays 250 m. */
export const MIN_CELL_SIZE_M = 50;
export const MAX_CELL_SIZE_M = 1000;

export const DEFAULT_RADIUS_M = 500;
export const MIN_RADIUS_M = 100;
export const MAX_RADIUS_M = 2000;

/** Largest bbox span (width or height) the API will score in one request. */
export const MAX_BBOX_SPAN_M = 15_000;

/** Number of contributing categories returned per cell. */
export const HOTZONE_BREAKDOWN_LIMIT = 3;
