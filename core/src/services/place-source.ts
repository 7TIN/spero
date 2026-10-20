import type { Bbox, BusinessTypeId } from "@spero/shared";
import { MAX_TILES_PER_REQUEST } from "../config/cache";
import { tileFor, tileKey, tilesForBbox, unionBbox, type Tile } from "../lib/tiles";
import { fetchPlacesForType } from "./poi-provider";
import type { SourcePlace } from "./poi-types";
import {
  getFreshCompetitorTiles,
  hasCompetitorTile,
  readCompetitorsInBbox,
  saveCompetitorTile,
  type StoredPlace,
} from "./tile-cache";

/**
 * Cached competitors of one business type inside a bbox, fetching whatever
 * tiles are missing or stale first.
 */
export async function getPlacesForBbox(
  bbox: Bbox,
  type: BusinessTypeId,
): Promise<StoredPlace[]> {
  await refreshTiles(bbox, type);
  return readCompetitorsInBbox(bbox, type);
}

/** In-flight tile fetches, so concurrent callers share one provider request. */
const inFlight = new Map<string, Promise<void>>();

async function refreshTiles(
  bbox: Bbox,
  type: BusinessTypeId,
): Promise<void> {
  const tiles = tilesForBbox(bbox);

  if (tiles.length > MAX_TILES_PER_REQUEST) {
    throw new Error("Requested area covers too many tiles");
  }

  const fresh = getFreshCompetitorTiles(tiles, type);
  const pending = tiles.filter((tile) => !fresh.has(tileKey(tile)));
  if (pending.length === 0) return;

  const key = `${type}:${pending.map(tileKey).sort().join(",")}`;
  const existing = inFlight.get(key);
  if (existing) {
    await existing;
    return;
  }

  const task = fetchPendingTiles(pending, type);
  inFlight.set(key, task);

  try {
    await task;
  } finally {
    inFlight.delete(key);
  }
}

async function fetchPendingTiles(
  pending: Tile[],
  type: BusinessTypeId,
): Promise<void> {
  const pendingKeys = new Set(pending.map(tileKey));

  try {
    // One provider request covers the whole gap; results are then split back
    // into the tiles they belong to.
    const places = await fetchPlacesForType(unionBbox(pending), type);
    const grouped = new Map<string, SourcePlace[]>();
    for (const tile of pending) {
      grouped.set(tileKey(tile), []);
    }

    for (const place of places) {
      const key = tileKey(tileFor(place.lng, place.lat));
      if (!pendingKeys.has(key)) continue;
      grouped.get(key)?.push(place);
    }

    for (const tile of pending) {
      saveCompetitorTile(tile, type, grouped.get(tileKey(tile)) ?? []);
    }
  } catch (error) {
    // Serve whatever is already cached (even stale) rather than failing, as
    // long as every pending tile has something for this business type.
    if (pending.every((tile) => hasCompetitorTile(tile, type))) {
      console.warn(
        "Competitor fetch failed; serving stale cached tiles:",
        error instanceof Error ? error.message : error,
      );
      return;
    }

    throw error;
  }
}
