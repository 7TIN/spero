import { describe, expect, test } from "bun:test";
import { buildGrid } from "./grid";

const bbox = {
  minLng: 73.85,
  minLat: 18.51,
  maxLng: 73.86,
  maxLat: 18.52,
};

describe("buildGrid", () => {
  test("fills the bbox with a row-major grid", () => {
    const grid = buildGrid(bbox, 250);

    expect(grid.columns).toBeGreaterThan(1);
    expect(grid.rows).toBeGreaterThan(1);
    expect(grid.cells).toHaveLength(grid.columns * grid.rows);

    const first = grid.cellAt(0, 0);
    expect(first).not.toBeNull();
    expect(first?.index).toBe(0);
    expect(first?.column).toBe(0);
    expect(first?.row).toBe(0);
    expect(first?.centerLng).toBeGreaterThan(bbox.minLng);
    expect(first?.centerLat).toBeGreaterThan(bbox.minLat);

    const last = grid.cellAt(grid.columns - 1, grid.rows - 1);
    expect(last?.index).toBe(grid.cells.length - 1);
  });

  test("rejects coordinates outside the grid", () => {
    const grid = buildGrid(bbox, 250);

    expect(grid.cellAt(-1, 0)).toBeNull();
    expect(grid.cellAt(0, -1)).toBeNull();
    expect(grid.cellAt(grid.columns, 0)).toBeNull();
    expect(grid.cellAt(0, grid.rows)).toBeNull();
  });

  test("clips the final cell to the bbox edge", () => {
    const grid = buildGrid(bbox, 250);
    const last = grid.cells[grid.cells.length - 1]!;
    const east = last.ring[1]?.[0];
    const north = last.ring[2]?.[1];

    expect(east).toBeLessThanOrEqual(bbox.maxLng);
    expect(north).toBeLessThanOrEqual(bbox.maxLat);
    expect(last.ring[0]).toEqual(last.ring[4]);
  });
});
