import { describe, expect, test } from "bun:test";
import type { AgentContext } from "@spero/shared";
import { AgentError, parseAgentPlan, planWithRules } from "./agent";

const context: AgentContext = {
  bbox: {
    minLng: 73.85,
    minLat: 18.51,
    maxLng: 73.86,
    maxLat: 18.52,
  },
  zoom: 15,
  selectedCell: null,
  businessType: null,
  cellSize: 250,
  radius: 500,
  enabledCategories: [
    "college",
    "school",
    "hospital",
    "transport",
    "market",
    "worship",
    "hotel",
    "office",
    "entertainment",
    "food",
  ],
  basemap: "light",
  mode: "selection",
};

describe("planWithRules", () => {
  test("maps the gym / this area example to a viewport plan", () => {
    const plan = planWithRules(
      "this area and I wanted to start gym business here",
      context,
    );

    expect(plan.actions.businessType).toBe("gym");
    expect(plan.locationQuery).toBe("");
    expect(plan.useCurrentView).toBe(true);
    expect(plan.actions.clearSelection).toBe(true);
    expect(plan.reply).toContain("gyms");
  });

  test("extracts a named place for a cafe request", () => {
    const plan = planWithRules("open a cafe in Koregaon Park", context);

    expect(plan.actions.businessType).toBe("cafe");
    expect(plan.locationQuery).toBe("Koregaon Park");
    expect(plan.useCurrentView).toBe(false);
    expect(plan.actions.clearSelection).toBe(true);
  });

  test("does not treat 'this area' as a place name", () => {
    const plan = planWithRules("show gyms in this area", context);

    expect(plan.actions.businessType).toBe("gym");
    expect(plan.locationQuery).toBe("");
    expect(plan.useCurrentView).toBe(true);
  });

  test("extracts category, range, and basemap controls", () => {
    const plan = planWithRules(
      "show schools and hospitals, use 300 m cells, 750 m reach, dark map",
      context,
    );

    expect(plan.actions.categories).toEqual(["school", "hospital"]);
    expect(plan.actions.cellSizeMeters).toBe(300);
    expect(plan.actions.radiusMeters).toBe(750);
    expect(plan.actions.basemap).toBe("dark");
  });

  test("normalizes out-of-range values instead of trusting them", () => {
    const plan = planWithRules("use 9999 m cells and 10 km radius", context);

    expect(plan.actions.cellSizeMeters).toBe(1000);
    expect(plan.actions.radiusMeters).toBe(2000);
  });

  test("returns a useful prompt when nothing matches", () => {
    const plan = planWithRules("what should I do today", context);

    expect(plan.actions.businessType).toBe("none");
    expect(plan.actions.categories).toEqual([]);
    expect(plan.locationQuery).toBe("");
    expect(plan.reply).toContain("open a gym");
  });
});

describe("parseAgentPlan", () => {
  test("accepts the exact structured-output shape", () => {
    const plan = parseAgentPlan(
      JSON.stringify({
        reply: "Showing gyms around Baner.",
        locationQuery: "Baner, Pune",
        useCurrentView: false,
        actions: {
          businessType: "gym",
          categories: [],
          cellSizeMeters: 0,
          radiusMeters: 750,
          basemap: "keep",
          mode: "keep",
          clearSelection: true,
        },
      }),
    );

    expect(plan.actions.businessType).toBe("gym");
    expect(plan.locationQuery).toBe("Baner, Pune");
    expect(plan.actions.cellSizeMeters).toBe(0);
    expect(plan.actions.radiusMeters).toBe(750);
  });

  test("parses a fenced JSON response and applies defaults", () => {
    const plan = parseAgentPlan(
      '```json\n{"reply":"Done."}\n```',
    );

    expect(plan.reply).toBe("Done.");
    expect(plan.locationQuery).toBe("");
    expect(plan.useCurrentView).toBe(true);
    expect(plan.actions.businessType).toBe("none");
    expect(plan.actions.clearSelection).toBe(false);
  });

  test("rejects an unknown business type", () => {
    expect(() =>
      parseAgentPlan(
        JSON.stringify({
          reply: "Done.",
          actions: { businessType: "spaceship" },
        }),
      ),
    ).toThrow(AgentError);
  });

  test("rejects non-JSON output", () => {
    expect(() => parseAgentPlan("I can help with that.")).toThrow(AgentError);
  });
});
