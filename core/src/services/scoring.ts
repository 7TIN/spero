import type {
  Bbox,
  HotzoneBreakdownItem,
  HotzoneFeature,
  HotzoneFeatureCollection,
  PoiCategory,
  PoiFeature,
  PoiFeatureCollection,
} from "@spero/shared";
import { HOTZONE_BREAKDOWN_LIMIT, GRID_SRID } from "../config/scoring";
import { CATEGORY_WEIGHTS } from "../config/weights";
import { sql } from "../db";

const HOTZONES_QUERY = `
WITH params AS (
  SELECT
    ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), ${GRID_SRID}) AS bbox_metric,
    $5::double precision AS cell_size,
    $6::double precision AS radius
),
weights AS (
  SELECT key AS category, value::double precision AS weight
  FROM jsonb_each_text($7::jsonb)
),
grid AS (
  SELECT
    row_number() OVER () AS cell_id,
    cells.geom,
    ST_Centroid(cells.geom) AS center
  FROM params
  CROSS JOIN LATERAL ST_SquareGrid(params.cell_size, params.bbox_metric) AS cells(geom, i, j)
),
contrib AS (
  SELECT
    grid.cell_id,
    pois.category,
    count(*)::int AS poi_count,
    sum(
      weights.weight *
      (1 - ST_Distance(grid.center, ST_Transform(pois.geom, ${GRID_SRID})) / params.radius)
    ) AS contribution
  FROM grid
  CROSS JOIN params
  JOIN pois
    ON ST_DWithin(grid.center, ST_Transform(pois.geom, ${GRID_SRID}), params.radius)
  JOIN weights ON weights.category = pois.category
  GROUP BY grid.cell_id, pois.category
),
scores AS (
  SELECT cell_id, sum(contribution) AS raw_score
  FROM contrib
  GROUP BY cell_id
  HAVING sum(contribution) > 0
),
normalized AS (
  SELECT
    cell_id,
    CASE
      WHEN max(raw_score) OVER () = min(raw_score) OVER () THEN 100::double precision
      ELSE (
        (raw_score - min(raw_score) OVER ()) /
        (max(raw_score) OVER () - min(raw_score) OVER ()) *
        100
      )::double precision
    END AS score
  FROM scores
),
ranked AS (
  SELECT
    cell_id,
    category,
    poi_count,
    contribution,
    row_number() OVER (
      PARTITION BY cell_id
      ORDER BY contribution DESC, category
    ) AS rank_order
  FROM contrib
),
breakdown AS (
  SELECT
    cell_id,
    jsonb_agg(
      jsonb_build_object('category', category, 'count', poi_count)
      ORDER BY contribution DESC, category
    ) FILTER (WHERE rank_order <= $8) AS breakdown
  FROM ranked
  GROUP BY cell_id
)
SELECT
  ST_AsGeoJSON(ST_Transform(grid.geom, 4326))::jsonb AS geometry,
  round(normalized.score::numeric, 1)::double precision AS score,
  COALESCE(breakdown.breakdown, '[]'::jsonb) AS breakdown
FROM grid
JOIN normalized ON normalized.cell_id = grid.cell_id
JOIN breakdown ON breakdown.cell_id = grid.cell_id
ORDER BY normalized.score DESC
`;

const POIS_QUERY = `
SELECT
  ST_AsGeoJSON(pois.geom)::jsonb AS geometry,
  pois.name,
  pois.category
FROM pois
WHERE pois.geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
  AND pois.category IN (SELECT jsonb_array_elements_text($5::jsonb))
ORDER BY pois.category, pois.name
`;

interface HotzoneRow {
  geometry: HotzoneFeature["geometry"];
  score: number;
  breakdown: HotzoneBreakdownItem[];
}

interface PoiRow {
  geometry: PoiFeature["geometry"];
  name: string | null;
  category: PoiCategory;
}

export interface HotzonesParams {
  bbox: Bbox;
  cell: number;
  radius: number;
}

export interface PoisParams {
  bbox: Bbox;
  categories: PoiCategory[];
}

export async function getHotzones({
  bbox,
  cell,
  radius,
}: HotzonesParams): Promise<HotzoneFeatureCollection> {
  const rows = await sql.unsafe<HotzoneRow[]>(HOTZONES_QUERY, [
    bbox.minLng,
    bbox.minLat,
    bbox.maxLng,
    bbox.maxLat,
    cell,
    radius,
    JSON.stringify(CATEGORY_WEIGHTS),
    HOTZONE_BREAKDOWN_LIMIT,
  ]);

  return {
    type: "FeatureCollection",
    features: rows.map((row) => ({
      type: "Feature",
      geometry: row.geometry,
      properties: {
        score: row.score,
        breakdown: row.breakdown,
      },
    })),
  };
}

export async function getPois({
  bbox,
  categories,
}: PoisParams): Promise<PoiFeatureCollection> {
  if (categories.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  const rows = await sql.unsafe<PoiRow[]>(POIS_QUERY, [
    bbox.minLng,
    bbox.minLat,
    bbox.maxLng,
    bbox.maxLat,
    JSON.stringify(categories),
  ]);

  return {
    type: "FeatureCollection",
    features: rows.map((row) => ({
      type: "Feature",
      geometry: row.geometry,
      properties: {
        name: row.name,
        category: row.category,
      },
    })),
  };
}
