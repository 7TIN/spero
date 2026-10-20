import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Bbox, BusinessTypeId, PoiCategory } from "@spero/shared";
import { TILE_CACHE_PATH, TILE_TTL_MS } from "../config/cache";
import { GEOAPIFY_FREE_DAILY_CREDITS, POI_PROVIDER } from "../config/poi";
import { tileKey, type Tile } from "../lib/tiles";
import type { SourcePlace, SourcePoi } from "./poi-types";

export type StoredPoi = SourcePoi;
export type StoredPlace = SourcePlace;

/**
 * Bumped whenever the cached shape changes. A cache is disposable, so a
 * version change simply refetches the tiles the user is looking at.
 */
const CACHE_VERSION = "2";

const META_CREDITS_DATE = "geoapify_credits_date";
const META_CREDITS_TODAY = "geoapify_credits_today";

interface TileRow {
  fetched_at: number;
}

interface PoiRow {
  osm_id: string;
  category: PoiCategory;
  name: string | null;
  raw_category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  lng: number;
  lat: number;
}

interface CompetitorRow {
  place_id: string;
  type: BusinessTypeId;
  name: string | null;
  raw_category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  lng: number;
  lat: number;
}

let database: Database | null = null;

function readMeta(db: Database, key: string): string | null {
  const row = db
    .query<{ value: string }, [string]>(
      "SELECT value FROM meta WHERE key = ?",
    )
    .get(key);
  return row?.value ?? null;
}

function writeMeta(db: Database, key: string, value: string): void {
  db.query<unknown, [string, string]>(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}

function ensureColumn(
  db: Database,
  table: string,
  column: string,
  definition: string,
): void {
  const columns = db
    .query<{ name: string }, []>(`PRAGMA table_info(${table})`)
    .all();

  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

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
      raw_category TEXT,
      address TEXT,
      phone TEXT,
      website TEXT,
      opening_hours TEXT,
      lng REAL NOT NULL,
      lat REAL NOT NULL,
      tile_x INTEGER NOT NULL,
      tile_y INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS competitor_tiles (
      tile_x INTEGER NOT NULL,
      tile_y INTEGER NOT NULL,
      type TEXT NOT NULL,
      fetched_at INTEGER NOT NULL,
      place_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tile_x, tile_y, type)
    );

    CREATE TABLE IF NOT EXISTS competitors (
      place_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT,
      raw_category TEXT,
      address TEXT,
      phone TEXT,
      website TEXT,
      opening_hours TEXT,
      lng REAL NOT NULL,
      lat REAL NOT NULL,
      tile_x INTEGER NOT NULL,
      tile_y INTEGER NOT NULL,
      PRIMARY KEY (place_id, type)
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS pois_tile_idx ON pois (tile_x, tile_y);
    CREATE INDEX IF NOT EXISTS pois_lng_lat_idx ON pois (lng, lat);
    CREATE INDEX IF NOT EXISTS competitors_tile_type_idx
      ON competitors (tile_x, tile_y, type);
    CREATE INDEX IF NOT EXISTS competitors_lng_lat_type_idx
      ON competitors (lng, lat, type);

    -- The cache was named after Overpass before Geoapify support was added.
    DROP TABLE IF EXISTS overpass_tiles;
  `);

  // Existing caches predate the place-detail columns. Add them in place so a
  // cache created by the previous version still opens cleanly.
  ensureColumn(db, "pois", "raw_category", "TEXT");
  ensureColumn(db, "pois", "address", "TEXT");
  ensureColumn(db, "pois", "phone", "TEXT");
  ensureColumn(db, "pois", "website", "TEXT");
  ensureColumn(db, "pois", "opening_hours", "TEXT");

  // Results from different providers must never be mixed in one tile: the same
  // place could be cached twice and counted twice by the scoring pass.
  // A version bump also clears once, so older rows gain the new detail fields.
  const storedProvider = readMeta(db, "provider");
  const storedVersion = readMeta(db, "cache_version");

  if (
    storedProvider !== POI_PROVIDER ||
    storedVersion !== CACHE_VERSION
  ) {
    db.exec("DELETE FROM pois");
    db.exec("DELETE FROM poi_tiles");
    db.exec("DELETE FROM competitors");
    db.exec("DELETE FROM competitor_tiles");
    writeMeta(db, "provider", POI_PROVIDER);
    writeMeta(db, "cache_version", CACHE_VERSION);
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
      [
        string,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        number,
        number,
        number,
        number,
      ]
    >(
      `INSERT OR REPLACE INTO pois
         (osm_id, category, name, raw_category, address, phone, website,
          opening_hours, lng, lat, tile_x, tile_y)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const poi of pois) {
      insert.run(
        poi.osmId,
        poi.category,
        poi.name,
        poi.rawCategory,
        poi.address,
        poi.phone,
        poi.website,
        poi.openingHours,
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
      `SELECT osm_id, category, name, raw_category, address, phone, website,
              opening_hours, lng, lat
       FROM pois
       WHERE lng BETWEEN ? AND ? AND lat BETWEEN ? AND ?
       ORDER BY category, name`,
    )
    .all(bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat);

  return rows.map((row) => ({
    osmId: row.osm_id,
    category: row.category,
    name: row.name,
    rawCategory: row.raw_category,
    address: row.address,
    phone: row.phone,
    website: row.website,
    openingHours: row.opening_hours,
    lng: row.lng,
    lat: row.lat,
  }));
}

/** Keys of the competitor tiles cached for one type and still fresh. */
export function getFreshCompetitorTiles(
  tiles: Tile[],
  type: BusinessTypeId,
): Set<string> {
  const db = getDatabase();
  const statement = db.query<TileRow, [number, number, string]>(
    `SELECT fetched_at FROM competitor_tiles
     WHERE tile_x = ? AND tile_y = ? AND type = ?`,
  );
  const now = Date.now();
  const fresh = new Set<string>();

  for (const tile of tiles) {
    const row = statement.get(tile.x, tile.y, type);
    if (row && now - row.fetched_at < TILE_TTL_MS) {
      fresh.add(tileKey(tile));
    }
  }

  return fresh;
}

/** Whether a competitor tile has a cached row for this type, fresh or stale. */
export function hasCompetitorTile(
  tile: Tile,
  type: BusinessTypeId,
): boolean {
  const row = getDatabase()
    .query<{ one: number }, [number, number, string]>(
      `SELECT 1 AS one FROM competitor_tiles
       WHERE tile_x = ? AND tile_y = ? AND type = ?`,
    )
    .get(tile.x, tile.y, type);

  return row !== null;
}

/** Replace the cached competitors of a tile and type with a fresh fetch. */
export function saveCompetitorTile(
  tile: Tile,
  type: BusinessTypeId,
  places: SourcePlace[],
): void {
  const db = getDatabase();

  const replace = db.transaction(() => {
    const deleteTile = db.query<unknown, [number, number, string]>(
      `DELETE FROM competitors
       WHERE tile_x = ? AND tile_y = ? AND type = ?`,
    );
    deleteTile.run(tile.x, tile.y, type);

    const insert = db.query<
      unknown,
      [
        string,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        number,
        number,
        number,
        number,
      ]
    >(
      `INSERT OR REPLACE INTO competitors
         (place_id, type, name, raw_category, address, phone, website,
          opening_hours, lng, lat, tile_x, tile_y)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const place of places) {
      insert.run(
        place.placeId,
        place.type,
        place.name,
        place.rawCategory,
        place.address,
        place.phone,
        place.website,
        place.openingHours,
        place.lng,
        place.lat,
        tile.x,
        tile.y,
      );
    }

    const upsertTile = db.query<
      unknown,
      [number, number, string, number, number]
    >(
      `INSERT INTO competitor_tiles
         (tile_x, tile_y, type, fetched_at, place_count)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(tile_x, tile_y, type) DO UPDATE SET
         fetched_at = excluded.fetched_at,
         place_count = excluded.place_count`,
    );
    upsertTile.run(tile.x, tile.y, type, Date.now(), places.length);
  });

  replace();
}

/** Cached competitors of one type inside a bbox. */
export function readCompetitorsInBbox(
  bbox: Bbox,
  type: BusinessTypeId,
): StoredPlace[] {
  const rows = getDatabase()
    .query<CompetitorRow, [number, number, number, number, string]>(
      `SELECT place_id, type, name, raw_category, address, phone, website,
              opening_hours, lng, lat
       FROM competitors
       WHERE lng BETWEEN ? AND ? AND lat BETWEEN ? AND ? AND type = ?
       ORDER BY name`,
    )
    .all(bbox.minLng, bbox.maxLng, bbox.minLat, bbox.maxLat, type);

  return rows.map((row) => ({
    placeId: row.place_id,
    type: row.type,
    name: row.name,
    rawCategory: row.raw_category,
    address: row.address,
    phone: row.phone,
    website: row.website,
    openingHours: row.opening_hours,
    lng: row.lng,
    lat: row.lat,
  }));
}

/** Rough cache size, reported by `/health`. */
export function cacheStats(): {
  tiles: number;
  pois: number;
  competitorTiles: number;
  competitors: number;
} {
  const db = getDatabase();
  const tiles = db
    .query<{ count: number }, []>("SELECT count(*) AS count FROM poi_tiles")
    .get();
  const pois = db
    .query<{ count: number }, []>("SELECT count(*) AS count FROM pois")
    .get();
  const competitorTiles = db
    .query<{ count: number }, []>(
      "SELECT count(*) AS count FROM competitor_tiles",
    )
    .get();
  const competitors = db
    .query<{ count: number }, []>(
      "SELECT count(*) AS count FROM competitors",
    )
    .get();

  return {
    tiles: tiles?.count ?? 0,
    pois: pois?.count ?? 0,
    competitorTiles: competitorTiles?.count ?? 0,
    competitors: competitors?.count ?? 0,
  };
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add the estimated credits spent by a Geoapify request to today's counter. */
export function recordGeoapifyCredits(credits: number): void {
  if (!Number.isFinite(credits) || credits <= 0) return;

  const db = getDatabase();
  const today = utcDay();
  const storedDate = readMeta(db, META_CREDITS_DATE);
  const storedCredits =
    storedDate === today
      ? Number.parseInt(readMeta(db, META_CREDITS_TODAY) ?? "0", 10)
      : 0;

  writeMeta(db, META_CREDITS_DATE, today);
  writeMeta(
    db,
    META_CREDITS_TODAY,
    String((Number.isFinite(storedCredits) ? storedCredits : 0) + credits),
  );
}

/** Geoapify credits recorded for the current UTC day. */
export function geoapifyCreditsToday(): {
  used: number;
  dailyLimit: number;
} {
  const db = getDatabase();
  const today = utcDay();
  const storedDate = readMeta(db, META_CREDITS_DATE);
  const used =
    storedDate === today
      ? Number.parseInt(readMeta(db, META_CREDITS_TODAY) ?? "0", 10)
      : 0;

  return {
    used: Number.isFinite(used) ? used : 0,
    dailyLimit: GEOAPIFY_FREE_DAILY_CREDITS,
  };
}
