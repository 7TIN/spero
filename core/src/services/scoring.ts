import type {
  Bbox,
  HotzoneBreakdownItem,
  HotzoneFeature,
  HotzoneFeatureCollection,
  PoiCategory,
  PoiFeatureCollection,
} from "@spero/shared";
import { HOTZONE_BREAKDOWN_LIMIT } from "../config/scoring";
import { CATEGORY_WEIGHTS } from "../config/weights";
import { expandBbox, haversineMeters } from "../lib/geo";
import { buildGrid } from "../lib/grid";
import { getPoisForBbox } from "./poi-source";

export interface HotzonesParams {
  bbox: Bbox;
  cell: number;
  radius: number;
}

export interface PoisParams {
  bbox: Bbox;
  categories: PoiCategory[];
}

interface CategoryContribution {
  contribution: number;
  count: number;
}

interface CellScore {
  raw: number;
  categories: Map<PoiCategory, CategoryContribution>;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function topBreakdown(
  categories: Map<PoiCategory, CategoryContribution>,
): HotzoneBreakdownItem[] {
  return [...categories.entries()]
    .sort((a, b) => {
      const byContribution = b[1].contribution - a[1].contribution;
      if (byContribution !== 0) return byContribution;
      return a[0].localeCompare(b[0]);
    })
    .slice(0, HOTZONE_BREAKDOWN_LIMIT)
    .map(([category, value]) => ({ category, count: value.count }));
}

export async function getHotzones({
  bbox,
  cell,
  radius,
}: HotzonesParams): Promise<HotzoneFeatureCollection> {
  // Pad the search area so POIs just outside the view still count for the
  // cells along its edges.
  const pois = await getPoisForBbox(expandBbox(bbox, radius));
  if (pois.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  const grid = buildGrid(bbox, cell);
  const radiusCells = Math.ceil(radius / cell) + 1;
  const scores = new Map<number, CellScore>();

  // Walk each POI outwards into the cells it can influence. This is far
  // cheaper than checking every cell against every POI.
  for (const poi of pois) {
    const weight = CATEGORY_WEIGHTS[poi.category];
    const baseColumn = Math.floor((poi.lng - bbox.minLng) / grid.lngStep);
    const baseRow = Math.floor((poi.lat - bbox.minLat) / grid.latStep);

    for (
      let row = baseRow - radiusCells;
      row <= baseRow + radiusCells;
      row += 1
    ) {
      for (
        let column = baseColumn - radiusCells;
        column <= baseColumn + radiusCells;
        column += 1
      ) {
        const cell = grid.cellAt(column, row);
        if (!cell) continue;

        const distance = haversineMeters(
          cell.centerLng,
          cell.centerLat,
          poi.lng,
          poi.lat,
        );
        if (distance > radius) continue;

        const contribution = weight * (1 - distance / radius);
        if (contribution <= 0) continue;

        const entry = scores.get(cell.index) ?? {
          raw: 0,
          categories: new Map<PoiCategory, CategoryContribution>(),
        };

        entry.raw += contribution;

        const categoryEntry = entry.categories.get(poi.category) ?? {
          contribution: 0,
          count: 0,
        };
        categoryEntry.contribution += contribution;
        categoryEntry.count += 1;
        entry.categories.set(poi.category, categoryEntry);

        scores.set(cell.index, entry);
      }
    }
  }

  if (scores.size === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  const rawValues = [...scores.values()].map((entry) => entry.raw);
  const min = Math.min(...rawValues);
  const max = Math.max(...rawValues);

  const features: HotzoneFeature[] = [];

  for (const [index, entry] of scores) {
    const cell = grid.cells[index];
    if (!cell) continue;

    const score = max === min ? 100 : ((entry.raw - min) / (max - min)) * 100;

    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [cell.ring],
      },
      properties: {
        score: roundTo(score, 1),
        breakdown: topBreakdown(entry.categories),
      },
    });
  }

  features.sort((a, b) => b.properties.score - a.properties.score);

  return { type: "FeatureCollection", features };
}

export async function getPois({
  bbox,
  categories,
}: PoisParams): Promise<PoiFeatureCollection> {
  if (categories.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  const allowed = new Set(categories);
  const pois = await getPoisForBbox(bbox);

  return {
    type: "FeatureCollection",
    features: pois
      .filter((poi) => allowed.has(poi.category))
      .map((poi) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [poi.lng, poi.lat],
        },
        properties: {
          name: poi.name,
          category: poi.category,
        },
      })),
  };
}
