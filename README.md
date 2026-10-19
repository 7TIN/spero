# Spero

A Bun workspace monorepo.

## Structure

```
spero/
├── core/   # @spero/core — Hono API running on Bun
└── web/    # @spero/web  — React + Vite + Tailwind CSS v4
```

## Requirements

- [Bun](https://bun.com) 1.4+
- Node.js 20+ (Vite and the shadcn CLI)

## Setup

```bash
bun install
```

## Database

Start PostGIS and create the local environment file:

```bash
docker compose up -d
cp core/.env.example core/.env
```

The database is exposed on `localhost:5432` and its data is kept in the named
`spero-postgres-data` volume.

## Development

```bash
bun run dev        # run core and web together
bun run dev:core   # core only  -> http://localhost:3000
bun run dev:web    # web only   -> http://localhost:5173
```

## Other scripts

```bash
bun run build      # build every package that defines a build script
bun run typecheck  # type check every package
bun run lint       # lint every package that defines a lint script
```

## Workspace packages

| Package       | Path   | Description                     |
| ------------- | ------ | ------------------------------- |
| `@spero/core` | `core` | Hono HTTP API                   |
| `@spero/web`  | `web`  | React app, Vite, Tailwind CSS   |

Packages are linked by Bun workspaces. Depend on one from another with
`"@spero/core": "workspace:*"`.
