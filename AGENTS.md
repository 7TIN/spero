# Agent notes

## Commit policy

- Commit after each completed step or feature instead of batching everything into one large commit.
- Keep each commit focused and buildable.
- Run the relevant checks before committing:
  - `bun run typecheck`
  - `bun run lint`
  - `bun run test`
  - `bun run build` for user-facing or packaging changes
- Push to `origin/main` after committing when the remote is configured.
- If a step is intentionally left incomplete, do not commit it until it is usable.

This file is the durable record of the policy so it survives context compaction.
