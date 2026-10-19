# @spero/core

Hono API running on Bun.

## Development

From the repo root:

```bash
bun run dev:core
```

Or from this directory:

```bash
bun run dev
```

The server listens on `http://localhost:3000` by default. Set `PORT` to change it.

## Entry point

`src/index.ts` exports the Hono app. Bun serves the app directly in development.
