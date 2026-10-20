/**
 * Gemini configuration for the map agent. The key stays on the server; the
 * browser only talks to POST /api/agent.
 */
export const GEMINI_API_KEY = (
  Bun.env.GEMINI_API_KEY ??
  Bun.env.GOOGLE_API_KEY ??
  ""
).trim();

/** Low-latency model chosen for small structured map plans. */
export const GEMINI_MODEL = (
  Bun.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite"
).trim();

export const GEMINI_API_BASE = (
  Bun.env.GEMINI_API_BASE ??
  "https://generativelanguage.googleapis.com/v1beta"
).replace(/\/+$/, "");

export const AGENT_TIMEOUT_MS = 25_000;

export const AGENT_MAX_QUERY_LENGTH = 500;

export function isAgentConfigured(): boolean {
  return GEMINI_API_KEY.length > 0;
}
