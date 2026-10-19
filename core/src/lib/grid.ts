import type { Bbox } from "@spero/shared";
import { METERS_PER_DEG_LAT, metersPerDegreeLng } from "./geo";

export interface GridCell {
  /** Row-major index into the grid. */
  index: number;
  column: number;
  row: number;
  centerLng: number;
  centerLat: number;
  /** Closed ring: first and last coordinate match. */
  ring: [number, number][];
}

export interface Grid {
  columns: number;
  rows: number;
  lngStep: number;
  latStep: number;
  cells: GridCell[];
  cellAt(column: number, row: number): GridCell | null;
}

/**
 * Square-ish cells in metres, expressed as lng/lat rectangles. The local metric
 * approximation is fine because cells are at most a kilometre and the bbox is
 * capped at 15 km; real distances use the haversine helper.
 */
export function buildGrid(bbox: Bbox, cellSizeM: number): Grid {
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const lngStep = cellSizeM / metersPerDegreeLng(midLat);
  const latStep = cellSizeM / METERS_PER_DEG_LAT;

  const columns = Math.max(1, Math.ceil((bbox.maxLng - bbox.minLng) / lngStep));
  const rows = Math.max(1, Math.ceil((bbox.maxLat - bbox.minLat) / latStep));

  const cells: GridCell[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const west = bbox.minLng + column * lngStep;
      const south = bbox.minLat + row * latStep;
      const east = Math.min(west + lngStep, bbox.maxLng);
      const north = Math.min(south + latStep, bbox.maxLat);

      cells.push({
        index: row * columns + column,
        column,
        row,
        centerLng: (west + east) / 2,
        centerLat: (south + north) / 2,
        ring: [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      });
    }
  }

  return {
    columns,
    rows,
    lngStep,
    latStep,
    cells,
    cellAt(column, row) {
      if (column < 0 || row < 0 || column >= columns || row >= rows) {
        return null;
      }
      return cells[row * columns + column] ?? null;
    },
  };
}
