/** Metric projection used for grid generation and distance math. */
export const GRID_SRID = 32643;

export const DEFAULT_CELL_SIZE_M = 250;
export const MIN_CELL_SIZE_M = 100;
export const MAX_CELL_SIZE_M = 1000;

export const DEFAULT_RADIUS_M = 500;
export const MIN_RADIUS_M = 100;
export const MAX_RADIUS_M = 2000;

/** Largest bbox span (width or height) the API will score in one request. */
export const MAX_BBOX_SPAN_M = 15_000;

/** Number of contributing categories returned per cell. */
export const HOTZONE_BREAKDOWN_LIMIT = 3;
