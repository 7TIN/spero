import { describe, expect, test } from "bun:test";
import { customMatchTerms, matchesPlaceTerms } from "./place-match";

describe("custom place matching", () => {
  test("keeps distinctive words and drops generic business words", () => {
    expect(customMatchTerms("Coffee shop")).toEqual(["coffee"]);
    expect(customMatchTerms("Café")).toEqual(["cafe"]);
    expect(customMatchTerms("Pet store")).toEqual(["pet"]);
    expect(customMatchTerms("Board game cafe")).toEqual([
      "board",
      "game",
      "cafe",
    ]);
  });

  test("matches a category even when the business name differs", () => {
    expect(
      matchesPlaceTerms("Serenity Wellness", ["service.beauty.spa"], ["spa"]),
    ).toBe(true);
    expect(
      matchesPlaceTerms("Wellness Studio", ["leisure.spa"], ["spa"]),
    ).toBe(true);
  });

  test("matches categories split on dots and underscores", () => {
    expect(
      matchesPlaceTerms(
        "Third Wave",
        ["catering.cafe.coffee_shop"],
        ["coffee"],
      ),
    ).toBe(true);
  });

  test("does not turn short terms into broad prefix matches", () => {
    expect(matchesPlaceTerms("Spatial Design", ["office.it"], ["spa"])).toBe(
      false,
    );
  });

  test("requires every word for longer custom labels", () => {
    const terms = customMatchTerms("Board game cafe");

    expect(
      matchesPlaceTerms(
        "Board Game Cafe",
        ["catering.cafe"],
        terms,
      ),
    ).toBe(true);
    expect(matchesPlaceTerms("Corner Cafe", ["catering.cafe"], terms)).toBe(
      false,
    );
  });

  test("accepts simple plural spellings", () => {
    expect(matchesPlaceTerms("Cafes", ["catering.cafe"], ["cafe"])).toBe(true);
    expect(matchesPlaceTerms("Spa", ["leisure.spa"], ["spas"])).toBe(true);
  });
});
