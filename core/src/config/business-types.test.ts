import { describe, expect, test } from "bun:test";
import { BUSINESS_TYPE_OPTIONS } from "@spero/shared";
import {
  BUSINESS_TYPES,
  businessTypeSource,
  customBusinessSource,
  getBusinessType,
} from "./business-types";

describe("business type mappings", () => {
  test("every shared option has a provider mapping", () => {
    expect(BUSINESS_TYPES).toHaveLength(BUSINESS_TYPE_OPTIONS.length);

    for (const option of BUSINESS_TYPE_OPTIONS) {
      const source = getBusinessType(option.id);

      expect(source.id).toBe(option.id);
      expect(source.label).toBe(option.label);
      expect(source.plural).toBe(option.plural);
      expect(source.geoapifyCategories.length).toBeGreaterThan(0);
      expect(source.osmTags.length).toBeGreaterThan(0);
    }
  });

  test("pharmacy maps to the expected provider category and OSM tag", () => {
    const source = getBusinessType("pharmacy");

    expect(source.geoapifyCategories).toContain("healthcare.pharmacy");
    expect(source.osmTags).toContainEqual({
      key: "amenity",
      value: "pharmacy",
    });
  });

  test("unknown types are rejected by the lookup helper", () => {
    expect(businessTypeSource("spaceship")).toBeNull();
  });

  test("maps common custom labels to provider categories", () => {
    const source = customBusinessSource("Pet store");

    expect(source.id).toMatch(/^custom:/);
    expect(source.geoapifyCategories).toContain("commercial.pet");
    expect(source.osmTags).toContainEqual({ key: "shop", value: "pet" });
    expect(source.nameQuery).toBeUndefined();
  });

  test("falls back to a name search for unknown custom labels", () => {
    const source = customBusinessSource("Board game cafe");

    expect(source.nameQuery).toBe("Board game cafe");
    expect(source.osmTags).toEqual([]);
    expect(source.geoapifyCategories).toContain("commercial");
  });

  test("keeps custom cache keys distinct and rejects empty labels", () => {
    expect(customBusinessSource("Pet store").id).not.toBe(
      customBusinessSource("Bookstore").id,
    );
    expect(() => customBusinessSource(" ")).toThrow();
  });
});
