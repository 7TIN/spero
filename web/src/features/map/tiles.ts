import type { Bbox } from "@spero/shared";

/**
 * Client tiles deliberately match the backend competitor cache. The server
 * already stores competitors per tile, so a stable tile-sized request lets the
 * browser reuse one response while the viewport moves inside that tile.
 *
 * Keep this in sync with TILE_SIZE_DEG in core/src/config/cache.ts.
 */
export const PLACE_TILE_SIZE_DEG = 0.05;

/** Mirrors MAX_TILES_PER_REQUEST in core/src/config/cache.ts. */
export const MAX_VIEW_PLACE_TILES = 64;

/**
 * A tile boundary can round to the neighbouring tile in floating point (for
 * example 73.8 / 0.05 is slightly below 1476). A tiny inset on only the edges
 * that actually belong to a neighbouring tile keeps each request scoped to one
 * backend tile without dropping places on the boundary that belong to this one.
 */
const TILE_EDGE_INSET_DEG = 1e-9;

export interface PlaceTile {
  x: number;
  y: number;
}

/** The tile that contains a coordinate. Mirrors core/src/lib/tiles.ts. */
export function placeTileFor(lng: number, lat: number): PlaceTile {
  return {
    x: Math.floor(lng / PLACE_TILE_SIZE_DEG),
    y: Math.floor(lat / PLACE_TILE_SIZE_DEG),
  };
}

/** The full lng/lat bounds of a tile. */
export function placeTileBounds(tile: PlaceTile): Bbox {
  const minLng = tile.x * PLACE_TILE_SIZE_DEG;
  const minLat = tile.y * PLACE_TILE_SIZE_DEG;

  return {
    minLng,
    minLat,
    maxLng: minLng + PLACE_TILE_SIZE_DEG,
    maxLat: minLat + PLACE_TILE_SIZE_DEG,
  };
}

/** Bounds used for the API request, scoped to exactly one backend tile. */
export function placeTileQueryBounds(tile: PlaceTile): Bbox {
  const bounds = placeTileBounds(tile);
  const minX = Math.floor(bounds.minLng / PLACE_TILE_SIZE_DEG);
  const maxX = Math.floor(bounds.maxLng / PLACE_TILE_SIZE_DEG);
  const minY = Math.floor(bounds.minLat / PLACE_TILE_SIZE_DEG);
  const maxY = Math.floor(bounds.maxLat / PLACE_TILE_SIZE_DEG);

  return {
    minLng:
      bounds.minLng + (minX === tile.x ? 0 : TILE_EDGE_INSET_DEG),
    minLat:
      bounds.minLat + (minY === tile.y ? 0 : TILE_EDGE_INSET_DEG),
    maxLng:
      bounds.maxLng - (maxX === tile.x ? 0 : TILE_EDGE_INSET_DEG),
    maxLat:
      bounds.maxLat - (maxY === tile.y ? 0 : TILE_EDGE_INSET_DEG),
  };
}

/** Every tile that overlaps a bbox, matching the backend's inclusive edges. */
export function placeTilesForBbox(bbox: Bbox): PlaceTile[] {
  const min = placeTileFor(bbox.minLng, bbox.minLat);
  const max = placeTileFor(bbox.maxLng, bbox.maxLat);

  const tiles: PlaceTile[] = [];
  for (let x = min.x; x <= max.x; x += 1) {
    for (let y = min.y; y <= max.y; y += 1) {
      tiles.push({ x, y });
    }
  }

  return tiles;
}
