import { Hono } from "hono";
import { getPlaces } from "../services/places";
import { placesQuerySchema } from "./schemas";

export const placesRoute = new Hono();

placesRoute.get("/", async (c) => {
  const parsed = placesQuerySchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query parameters" },
      400,
    );
  }

  const { bbox, type } = parsed.data;
  const data = await getPlaces({ bbox, type });

  return c.json(data);
});
