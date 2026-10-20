import { Hono } from "hono";
import { AgentError, runAgent } from "../services/agent";
import { agentRequestSchema } from "./schemas";

export const agentRoute = new Hono();

agentRoute.post("/", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be valid JSON" }, 400);
  }

  const parsed = agentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid agent request" },
      400,
    );
  }

  try {
    const response = await runAgent(
      parsed.data.query,
      parsed.data.context,
    );
    return c.json(response);
  } catch (error) {
    if (error instanceof AgentError) {
      return c.json({ error: error.message }, error.status);
    }
    throw error;
  }
});
