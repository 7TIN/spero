import type { Bbox } from "@spero/shared";
import { TILE_SIZE_DEG } from "../config/cache";

export interface Tile {
  x: number;
  y: number;
}

/** Stable string key for a tile, used as a Map/Set key. */
export function tileKey(tile: Tile): string {
  return `${tile.x}:${tile.y}`;
}

/** The tile that contains a coordinate. */
export function tileFor(lng: number, lat: number): Tile {
  return {
    x: Math.floor(lng / TILE_SIZE_DEG),
    y: Math.floor(lat / TILE_SIZE_DEG),
  };
}

/** The lng/lat bounds of a tile. */
export function tileBounds(tile: Tile): Bbox {
  const minLng = tile.x * TILE_SIZE_DEG;
  const minLat = tile.y * TILE_SIZE_DEG;

  return {
    minLng,
    minLat,
    maxLng: minLng + TILE_SIZE_DEG,
    maxLat: minLat + TILE_SIZE_DEG,
  };
}

/** Every tile that overlaps a bbox (inclusive on the far edge). */
export function tilesForBbox(bbox: Bbox): Tile[] {
  const min = tileFor(bbox.minLng, bbox.minLat);
  const max = tileFor(bbox.maxLng, bbox.maxLat);

  const tiles: Tile[] = [];
  for (let x = min.x; x <= max.x; x += 1) {
    for (let y = min.y; y <= max.y; y += 1) {
      tiles.push({ x, y });
    }
  }

  return tiles;
}

/** The smallest bbox containing every tile in the list. */
export function unionBbox(tiles: Tile[]): Bbox {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const tile of tiles) {
    const bounds = tileBounds(tile);
    minLng = Math.min(minLng, bounds.minLng);
    minLat = Math.min(minLat, bounds.minLat);
    maxLng = Math.max(maxLng, bounds.maxLng);
    maxLat = Math.max(maxLat, bounds.maxLat);
  }

  return { minLng, minLat, maxLng, maxLat };
}
