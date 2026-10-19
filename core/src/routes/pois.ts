import { Hono } from "hono";
import { getPois } from "../services/scoring";
import { poisQuerySchema } from "./schemas";

export const poisRoute = new Hono();

poisRoute.get("/", async (c) => {
  const parsed = poisQuerySchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid query parameters" },
      400,
    );
  }

  const { bbox, categories } = parsed.data;
  const data = await getPois({ bbox, categories });

  return c.json(data);
});
