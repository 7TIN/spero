import { Hono } from "hono";
import { getHotzones } from "../services/scoring";
import { hotzonesQuerySchema } from "./schemas";

export const hotzonesRoute = new Hono();

hotzonesRoute.get("/", async (c) => {
  const parsed = hotzonesQuerySchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query parameters" },
      400,
    );
  }

  const { bbox, cell, radius } = parsed.data;
  const data = await getHotzones({ bbox, cell, radius });

  return c.json(data);
});
