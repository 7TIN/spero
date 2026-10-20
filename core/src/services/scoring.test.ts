import { describe, expect, test } from "bun:test";
import type { PoiCategory } from "@spero/shared";
import type { SourcePoi } from "./poi-types";
import { computeHotzones, scoreContribution } from "./scoring";

function poi(
  category: PoiCategory,
  lng: number,
  lat: number,
  name = "Place",
): SourcePoi {
  return {
    osmId: `${category}:${lng}:${lat}`,
    category,
    name,
    rawCategory: null,
    address: null,
    phone: null,
    website: null,
    openingHours: null,
    lng,
    lat,
  };
}

const tinyBbox = {
  minLng: 73.8559,
  minLat: 18.5159,
  maxLng: 73.8561,
  maxLat: 18.5161,
};

describe("scoreContribution", () => {
  test("decays linearly from the full weight at zero distance", () => {
    expect(scoreContribution(9, 0, 500)).toBe(9);
    expect(scoreContribution(9, 250, 500)).toBe(4.5);
  });

  test("drops to zero at and beyond the radius", () => {
    expect(scoreContribution(9, 500, 500)).toBe(0);
    expect(scoreContribution(9, 750, 500)).toBe(0);
  });
});

describe("computeHotzones", () => {
  test("returns no features when there are no POIs", () => {
    const result = computeHotzones([], {
      bbox: tinyBbox,
      cell: 500,
      radius: 500,
    });

    expect(result.features).toHaveLength(0);
  });

  test("scores a single covered cell to 100 and keeps the top three categories", () => {
    const result = computeHotzones(
      [
        poi("transport", 73.856, 18.516),
        poi("hospital", 73.85602, 18.51602),
        poi("college", 73.85604, 18.51604),
        poi("food", 73.85606, 18.51606),
      ],
      { bbox: tinyBbox, cell: 500, radius: 500 },
    );

    expect(result.features).toHaveLength(1);

    const feature = result.features[0]!;
    expect(feature.properties.score).toBe(100);
    expect(feature.properties.breakdown).toHaveLength(3);
    expect(feature.properties.breakdown[0]?.category).toBe("transport");
    expect(
      feature.properties.breakdown.some((item) => item.category === "food"),
    ).toBe(false);
    expect(feature.properties.breakdown[0]?.count).toBe(1);
  });

  test("creates a grid larger than one cell for a wider bbox", () => {
    const result = computeHotzones(
      [
        poi("transport", 73.855, 18.515),
        poi("food", 73.861, 18.521),
      ],
      {
        bbox: {
          minLng: 73.85,
          minLat: 18.51,
          maxLng: 73.86,
          maxLat: 18.52,
        },
        cell: 250,
        radius: 500,
      },
    );

    expect(result.features.length).toBeGreaterThan(1);
    expect(Math.max(...result.features.map((item) => item.properties.score))).toBe(
      100,
    );
    expect(Math.min(...result.features.map((item) => item.properties.score))).toBe(
      0,
    );
  });
});
