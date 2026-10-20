import { Hono } from "hono";
import { GeocodeError, searchPlaces } from "../services/geocode";
import { geocodeQuerySchema } from "./schemas";

export const geocodeRoute = new Hono();

geocodeRoute.get("/", async (c) => {
  const parsed = geocodeQuerySchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query parameters" },
      400,
    );
  }

  try {
    const results = await searchPlaces(parsed.data.q, parsed.data.limit);
    return c.json({ results });
  } catch (error) {
    if (error instanceof GeocodeError) {
      return c.json({ error: error.message }, 502);
    }
    throw error;
  }
});
