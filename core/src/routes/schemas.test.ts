import { describe, expect, test } from "bun:test";
import { DEFAULT_CELL_SIZE_M, DEFAULT_RADIUS_M } from "../config/scoring";
import {
  agentRequestSchema,
  geocodeQuerySchema,
  hotzonesQuerySchema,
  placesQuerySchema,
  poisQuerySchema,
} from "./schemas";

const validBbox = "73.855,18.515,73.856,18.516";

describe("bbox validation", () => {
  test("accepts a valid bbox and applies the cell/radius defaults", () => {
    const result = hotzonesQuerySchema.safeParse({ bbox: validBbox });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cell).toBe(DEFAULT_CELL_SIZE_M);
      expect(result.data.radius).toBe(DEFAULT_RADIUS_M);
      expect(result.data.bbox).toEqual({
        minLng: 73.855,
        minLat: 18.515,
        maxLng: 73.856,
        maxLat: 18.516,
      });
    }
  });

  test("rejects malformed coordinates", () => {
    expect(hotzonesQuerySchema.safeParse({ bbox: "1,2,3" }).success).toBe(
      false,
    );
    expect(
      hotzonesQuerySchema.safeParse({ bbox: "a,b,c,d" }).success,
    ).toBe(false);
  });

  test("rejects reversed corners", () => {
    const result = hotzonesQuerySchema.safeParse({
      bbox: "73.86,18.52,73.85,18.51",
    });

    expect(result.success).toBe(false);
  });

  test("rejects a bbox wider than the 15 km cap", () => {
    const result = hotzonesQuerySchema.safeParse({
      bbox: "73.0,18.0,74.0,19.0",
    });

    expect(result.success).toBe(false);
  });

  test("rejects unknown POI categories", () => {
    const result = poisQuerySchema.safeParse({
      bbox: validBbox,
      categories: "school,spaceship",
    });

    expect(result.success).toBe(false);
  });
});

describe("geocode validation", () => {
  test("trims a query and applies the result limit", () => {
    const result = geocodeQuerySchema.safeParse({ q: "  Koregaon Park  " });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBe("Koregaon Park");
      expect(result.data.limit).toBe(5);
    }
  });

  test("rejects short queries and oversized limits", () => {
    expect(geocodeQuerySchema.safeParse({ q: "p" }).success).toBe(false);
    expect(
      geocodeQuerySchema.safeParse({ q: "Pune", limit: "9" }).success,
    ).toBe(false);
  });
});

describe("business type validation", () => {
  test("accepts a known type", () => {
    const result = placesQuerySchema.safeParse({
      bbox: validBbox,
      type: "pharmacy",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe("pharmacy");
  });

  test("rejects an unknown type", () => {
    const result = placesQuerySchema.safeParse({
      bbox: validBbox,
      type: "spaceship",
    });

    expect(result.success).toBe(false);
  });

  test("accepts a custom business with a label", () => {
    const result = placesQuerySchema.safeParse({
      bbox: validBbox,
      type: "custom",
      label: "  Pet store  ",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.label).toBe("Pet store");
  });

  test("rejects a custom business without a useful label", () => {
    expect(
      placesQuerySchema.safeParse({
        bbox: validBbox,
        type: "custom",
      }).success,
    ).toBe(false);
    expect(
      placesQuerySchema.safeParse({
        bbox: validBbox,
        type: "custom",
        label: "x",
      }).success,
    ).toBe(false);
  });
});

describe("agent request validation", () => {
  const context = {
    bbox: {
      minLng: 73.85,
      minLat: 18.51,
      maxLng: 73.86,
      maxLat: 18.52,
    },
    zoom: 15,
    selectedCell: null,
    businessType: null,
    customBusinessLabel: null,
    cellSize: 250,
    radius: 500,
    enabledCategories: ["school", "hospital"],
    basemap: "light",
    mode: "selection",
  };

  test("accepts a query with a valid control snapshot", () => {
    const result = agentRequestSchema.safeParse({
      query: "  start a gym in this area  ",
      context,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("start a gym in this area");
      expect(result.data.context.basemap).toBe("light");
    }
  });

  test("rejects invalid controls and short queries", () => {
    expect(
      agentRequestSchema.safeParse({
        query: "gym",
        context: { ...context, basemap: "satellite" },
      }).success,
    ).toBe(false);
    expect(
      agentRequestSchema.safeParse({
        query: "g",
        context,
      }).success,
    ).toBe(false);
  });

  test("defaults the custom business label for older contexts", () => {
    const { customBusinessLabel: _customBusinessLabel, ...legacyContext } =
      context;
    const result = agentRequestSchema.safeParse({
      query: "open a pet store in Hinjewadi",
      context: legacyContext,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.context.customBusinessLabel).toBeNull();
    }
  });
});
