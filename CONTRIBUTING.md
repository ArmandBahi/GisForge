# Contributing

## AI-assisted development

Before adding features, read:

1. [AGENTS.md](AGENTS.md) — stack, structure, forbidden patterns
2. [doc/ai/new-feature-checklist.md](doc/ai/new-feature-checklist.md) — 12-step checklist
3. [doc/ai/crud-pattern.md](doc/ai/crud-pattern.md) — reference walkthrough

## Validation

After changes, run:

```bash
npm run build
```

For boilerplate releases, run the QA prompts in [doc/ai/validation.md](doc/ai/validation.md).

## Conventions

- Angular standalone components only (no NgModules)
- Data access in services, not components
- Lazy routes per feature
- RLS on all new tables
- `npm run gen:types` after migrations
