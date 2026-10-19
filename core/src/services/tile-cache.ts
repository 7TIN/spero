import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Bbox, PoiCategory } from "@spero/shared";
import { TILE_CACHE_PATH, TILE_TTL_MS } from "../config/cache";
import { POI_PROVIDER } from "../config/poi";
import { tileKey, type Tile } from "../lib/tiles";
import type { SourcePoi } from "./poi-types";

export type StoredPoi = SourcePoi;

interface TileRow {
  fetched_at: number;
}

interface PoiRow {
  osm_id: string;
  category: PoiCategory;
  name: string | null;
  lng: number;
  lat: number;
}

let database: Database | null = null;

function getDatabase(): Database {
  if (database) return database;

  mkdirSync(dirname(TILE_CACHE_PATH), { recursive: true });

  const db = new Database(TILE_CACHE_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS poi_tiles (
      tile_x INTEGER NOT NULL,
      tile_y INTEGER NOT NULL,
      fetched_at INTEGER NOT NULL,
      poi_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tile_x, tile_y)
    );

    CREATE TABLE IF NOT EXISTS pois (
      osm_id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT,
      lng REAL NOT NULL,
      lat REAL NOT NULL,
      tile_x INTEGER NOT NULL,
      tile_y INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS pois_tile_idx ON pois (tile_x, tile_y);
    CREATE INDEX IF NOT EXISTS pois_lng_lat_idx ON pois (lng, lat);

    -- The cache was named after Overpass before Geoapify support was added.
    DROP TABLE IF EXISTS overpass_tiles;
  `);

  // Results from different providers must never be mixed in one tile: the same
  // place could be cached twice and counted twice by the scoring pass.
  const storedProvider = db
    .query<{ value: string }, [string]>(
      "SELECT value FROM meta WHERE key = ?",
    )
    .get("provider");

  if (storedProvider?.value !== POI_PROVIDER) {
    db.exec("DELETE FROM pois");
    db.exec("DELETE FROM poi_tiles");
    db.query<unknown, [string]>(
      `INSERT INTO meta (key, value) VALUES ('provider', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(POI_PROVIDER);
  }

  database = db;
  return db;
}

/** Keys of the tiles that are cached and still within their TTL. */
export function getFreshTiles(tiles: Tile[]): Set<string> {
  const db = getDatabase();
  const statement = db.query<TileRow, [number, number]>(
    "SELECT fetched_at FROM poi_tiles WHERE tile_x = ? AND tile_y = ?",
  );
  const now = Date.now();
  const fresh = new Set<string>();

  for (const tile of tiles) {
    const row = statement.get(tile.x, tile.y);
    if (row && now - row.fetched_at < TILE_TTL_MS) {
      fresh.add(tileKey(tile));
    }
  }

  return fresh;
}

/** Whether a tile has any cached row, fresh or stale. */
export function hasTile(tile: Tile): boolean {
  const row = getDatabase()
    .query<{ one: number }, [number, number]>(
      "SELECT 1 AS one FROM poi_tiles WHERE tile_x = ? AND tile_y = ?",
    )
    .get(tile.x, tile.y);

  return row !== null;
}

/** Replace the cached POIs of a tile with a fresh fetch. */
export function saveTile(tile: Tile, pois: SourcePoi[]): void {
  const db = getDatabase();

  const replace = db.transaction(() => {
    const deleteTile = db.query<unknown, [number, number]>(
      "DELETE FROM pois WHERE tile_x = ? AND tile_y = ?",
    );
    deleteTile.run(tile.x, tile.y);

    const insert = db.query<
      unknown,
      [string, string, string | null, number, number, number, number]
    >(
      `INSERT OR REPLACE INTO pois
         (osm_id, category, name, lng, lat, tile_x, tile_y)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const poi of pois) {
      insert.run(
        poi.osmId,
        poi.category,
        poi.name,
        poi.lng,
        poi.lat,
        tile.x,
        tile.y,
      );
    }

    const upsertTile = db.query<unknown, [number, number, number, number]>(
      `INSERT INTO poi_tiles (tile_x, tile_y, fetched_at, poi_count)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(tile_x, tile_y) DO UPDATE SET
         fetched_at = excluded.fetched_at,
         poi_count = excluded.poi_count`,
    );
    upsertTile.run(tile.x, tile.y, Date.now(), pois.length);
  });

  replace();
}

/** Cached POIs inside a bbox, ordered for a stable response. */
export function readPoisInBbox(bbox: Bbox): StoredPoi[] {
  const rows = getDatabase()
    .query<PoiRow, [number, number, number, number]>(
      `SELECT osm_id, category, name, lng, lat
       FROM pois
       WHERE lng BETWEEN ? AND ? AND lat BETWEEN ? AND ?
       ORDER BY category, name`,
    )
    .all(bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat);

  return rows.map((row) => ({
    osmId: row.osm_id,
    category: row.category,
    name: row.name,
    lng: row.lng,
    lat: row.lat,
  }));
}

/** Rough cache size, reported by `/health`. */
export function cacheStats(): { tiles: number; pois: number } {
  const db = getDatabase();
  const tiles = db
    .query<{ count: number }, []>("SELECT count(*) AS count FROM poi_tiles")
    .get();
  const pois = db
    .query<{ count: number }, []>("SELECT count(*) AS count FROM pois")
    .get();

  return { tiles: tiles?.count ?? 0, pois: pois?.count ?? 0 };
}
