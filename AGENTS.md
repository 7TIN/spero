# Agent notes

## Commit policy

- Commit at meaningful checkpoints: when a feature or coherent slice of work is complete and usable. Do not save everything for one giant commit, and do not create tiny filler commits after every small edit.
- Each commit should be reviewable on its own: focused, complete, and buildable. Avoid commits that exist only to increase the commit count.
- Use descriptive commit messages that explain what changed and why; avoid vague one-line messages.
- Run the relevant checks before committing:
  - `bun run typecheck`
  - `bun run lint`
  - `bun run test`
  - `bun run build` for user-facing or packaging changes
- Push to `origin/main` after committing when the remote is configured.
- If a step is intentionally left incomplete, do not commit it until it is usable.

This file is the durable record of the policy so it survives context compaction.
