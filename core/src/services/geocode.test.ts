import { describe, expect, test } from "bun:test";
import {
  alternateLocalitySpelling,
  normalizeNominatimResult,
  normalizeNominatimResults,
  resultMatchesQuery,
} from "./geocode";

describe("normalizeNominatimResult", () => {
  test("maps a full Nominatim hit to a geocode result", () => {
    const result = normalizeNominatimResult({
      place_id: 123,
      osm_type: "node",
      osm_id: 456,
      lat: "18.5204",
      lon: "73.8567",
      display_name: "Pune, Maharashtra, India",
      name: "Pune",
      type: "city",
      boundingbox: ["18.40", "18.63", "73.73", "73.99"],
    });

    expect(result).toEqual({
      id: "node/456",
      name: "Pune",
      label: "Pune, Maharashtra, India",
      category: "city",
      latitude: 18.5204,
      longitude: 73.8567,
      bbox: {
        minLng: 73.73,
        minLat: 18.4,
        maxLng: 73.99,
        maxLat: 18.63,
      },
    });
  });

  test("falls back to the first display-name segment and a place id", () => {
    const result = normalizeNominatimResult({
      place_id: 99,
      lat: "18.5",
      lon: "73.8",
      display_name: "Koregaon Park, Pune, Maharashtra, India",
      class: "place",
    });

    expect(result?.id).toBe("place/99");
    expect(result?.name).toBe("Koregaon Park");
    expect(result?.category).toBe("place");
    expect(result?.bbox).toBeNull();
  });

  test("rejects entries without usable coordinates", () => {
    expect(normalizeNominatimResult({ lat: "not-a-number", lon: "73.8" })).toBe(
      null,
    );
    expect(normalizeNominatimResult({ lat: "18.5" })).toBeNull();
  });

  test("ignores a degenerate bounding box", () => {
    const result = normalizeNominatimResult({
      lat: "18.5",
      lon: "73.8",
      display_name: "Point",
      boundingbox: ["18.5", "18.5", "73.8", "73.8"],
    });

    expect(result?.bbox).toBeNull();
  });
});

describe("normalizeNominatimResults", () => {
  test("drops malformed entries and non-arrays", () => {
    const results = normalizeNominatimResults([
      { lat: "18.5", lon: "73.8", display_name: "Valid" },
      { lat: "nope", lon: "73.8" },
      null,
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Valid");
    expect(normalizeNominatimResults({ error: "not an array" })).toEqual([]);
  });
});

describe("locality query matching", () => {
  const wakad = normalizeNominatimResult({
    lat: "18.5920497",
    lon: "73.7579029",
    name: "Wakad Flyover",
    display_name: "Wakad Flyover, Wakad gaav, Pune, Maharashtra, India",
  });
  const hinjawadi = normalizeNominatimResult({
    lat: "18.5927532",
    lon: "73.7382151",
    name: "Hinjawadi",
    display_name: "Hinjawadi, Pune, Maharashtra, India",
  });

  test("rejects a fuzzy result that does not contain the query", () => {
    expect(wakad).not.toBeNull();
    expect(resultMatchesQuery("Hinjewadi", wakad!)).toBe(false);
    expect(resultMatchesQuery("Pune", wakad!)).toBe(true);
    expect(resultMatchesQuery("Hinjewadi, Pune", wakad!)).toBe(false);
  });

  test("accepts a result whose name contains the query", () => {
    expect(hinjawadi).not.toBeNull();
    expect(resultMatchesQuery("Hinjawadi", hinjawadi!)).toBe(true);
    expect(resultMatchesQuery("Hinjawadi, Pune", hinjawadi!)).toBe(true);
  });

  test("generates the alternate -wadi spelling", () => {
    expect(alternateLocalitySpelling("Hinjewadi, Pune")).toBe(
      "Hinjawadi, Pune",
    );
    expect(alternateLocalitySpelling("Hinjawadi, Pune")).toBe(
      "Hinjewadi, Pune",
    );
    expect(alternateLocalitySpelling("Baner, Pune")).toBeNull();
  });
});
