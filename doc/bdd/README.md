# Database documentation

| Document | Schema | Description |
|----------|--------|-------------|
| [administration.md](administration.md) | `administration` | Multi-tenant core: organizations, users, roles, groups |
| [app.md](app.md) | `app` | Business tables (add docs when creating new domains) |

When adding business tables, create a new file here (e.g. `app.md` for the `app` schema).

After any schema change, update the relevant doc and run `npm run gen:types`.
