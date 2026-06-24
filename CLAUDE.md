# Claude Code — GisForge

Read **[AGENTS.md](AGENTS.md)** first. It contains the stack, structure, naming, and forbidden patterns.

## Quick links

- [doc/ai/README.md](doc/ai/README.md) — AI documentation index
- [doc/ai/crud-pattern.md](doc/ai/crud-pattern.md) — CRUD reference walkthrough
- [doc/ai/new-feature-checklist.md](doc/ai/new-feature-checklist.md) — new feature checklist
- [doc/ai/prompts/](doc/ai/prompts/) — example prompts

## Before you code

1. Identify the feature folder under `src/app/features/`
2. Check if a migration is needed (`supabase/migrations/`)
3. Copy patterns from `features/users` for CRUD screens
4. Run `npm run gen:types` after DB changes
5. Run `npm run build` to validate
