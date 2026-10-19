# @spero/web

React + TypeScript + Vite + Tailwind CSS v4.

## Development

From the repo root:

```bash
bun run dev:web
```

Or from this directory:

```bash
bun run dev
```

The app runs at `http://localhost:5173` by default.

## Styling

Tailwind CSS is configured through the `@tailwindcss/vite` plugin in
`vite.config.ts`. `src/index.css` imports Tailwind, `tw-animate-css`, and
`shadcn/tailwind.css`, then defines the theme:

- `:root` holds the light theme variables.
- `.dark` overrides them for dark mode.
- The `.dark` class is applied to `<html>`.

Theme preference is read from `localStorage` and falls back to the system
preference. The toggle in `App.tsx` updates both.

Fonts are referenced through CSS variables but not bundled. Add your font files
or a font provider and set the `--app-font-*` variables in `src/index.css`.
