import type { Bbox } from "@spero/shared";
import { MAX_TILES_PER_REQUEST } from "../config/cache";
import { tileFor, tileKey, tilesForBbox, unionBbox } from "../lib/tiles";
import type { OverpassPoi } from "./overpass";
import { fetchPoisForBbox } from "./overpass";
import {
  getFreshTiles,
  hasTile,
  readPoisInBbox,
  saveTile,
  type StoredPoi,
} from "./tile-cache";

/**
 * Cached POIs inside a bbox, fetching whatever tiles are missing or stale
 * first. `bbox` should be padded by the scoring radius when it is used for hot
 * zones, so edge POIs are included.
 */
export async function getPoisForBbox(bbox: Bbox): Promise<StoredPoi[]> {
  await refreshTiles(bbox);
  return readPoisInBbox(bbox);
}

async function refreshTiles(bbox: Bbox): Promise<void> {
  const tiles = tilesForBbox(bbox);

  if (tiles.length > MAX_TILES_PER_REQUEST) {
    throw new Error("Requested area covers too many tiles");
  }

  const fresh = getFreshTiles(tiles);
  const pending = tiles.filter((tile) => !fresh.has(tileKey(tile)));
  if (pending.length === 0) return;

  const pendingKeys = new Set(pending.map(tileKey));

  try {
    // One Overpass request covers the whole gap; results are then split back
    // into the tiles they belong to.
    const pois = await fetchPoisForBbox(unionBbox(pending));
    const grouped = new Map<string, OverpassPoi[]>();
    for (const tile of pending) {
      grouped.set(tileKey(tile), []);
    }

    for (const poi of pois) {
      const key = tileKey(tileFor(poi.lng, poi.lat));
      if (!pendingKeys.has(key)) continue;
      grouped.get(key)?.push(poi);
    }

    for (const tile of pending) {
      saveTile(tile, grouped.get(tileKey(tile)) ?? []);
    }
  } catch (error) {
    // Serve whatever is already cached (even stale) rather than failing, as
    // long as every pending tile has something.
    if (pending.every(hasTile)) {
      console.warn(
        "Overpass fetch failed; serving stale cached tiles:",
        error instanceof Error ? error.message : error,
      );
      return;
    }

    throw error;
  }
}
