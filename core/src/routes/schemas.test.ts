import { describe, expect, test } from "bun:test";
import { DEFAULT_CELL_SIZE_M, DEFAULT_RADIUS_M } from "../config/scoring";
import {
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
});
