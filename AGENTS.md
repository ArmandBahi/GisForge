# GisForge — AI generation rules

Boilerplate Angular + Supabase for building business apps with AI tools (Cursor, Claude Code).

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Angular 19+ standalone, signals, `inject()` |
| UI | Spartan UI (Helm) + Tailwind CSS v4 |
| Backend | Supabase (Auth, Postgres, RLS) |
| State | Services + signals (no NgRx) |
| Routing | Lazy `loadComponent` / `loadChildren` per feature |
| Forms | Reactive Forms |
| Toasts | ngx-sonner |
| Icons | Lucide Angular (`@lucide/angular`) |

## Golden rule

**1 feature = 1 folder = 1 lazy route = 1 data service.**

The AI always knows where to create code. Never register all pages statically in the root router.

## Where to put code

| Path | Purpose |
|------|---------|
| `src/app/core/` | Singletons: auth, layout, supabase — no business features |
| `src/app/shared/ui/` | Spartan Helm components (copied, not npm) |
| `src/app/features/<name>/` | One folder per business domain |
| `supabase/migrations/` | SQL migrations (timestamped) |
| `doc/bdd/` | Database documentation |
| `doc/ai/` | Detailed AI guides (read these for depth) |

## Naming

| File | Pattern |
|------|---------|
| Page | `<feature>.page.ts` |
| Service | `<feature>.service.ts` |
| Routes | `<feature>.routes.ts` |
| Types | `<feature>.types.ts` |
| Route constant | `<FEATURE>_ROUTES` (e.g. `USERS_ROUTES`) |

Import alias: `@app/*` → `src/app/*`

## CRUD pattern (reference: `features/users`)

```
PageHeader (title + Add button)
  → Table (hlm-table)
  → Dialog create/edit (hlm-dialog + stateChanged sync)
  → Delete confirmation dialog (not confirm())
  → Service CRUD
  → Toasts (success / error)
```

- Data flows through the service only — **never call Supabase from a component**.
- Filters: use `signal()` + `computed()` (OnPush components won't react to plain properties).
- Dialogs: bind `[state]` and `(stateChanged)`; on open, set `closed` then `open` to force re-render.

## Supabase

- Migrations: `YYYYMMDDHHMMSS_description.sql` in `supabase/migrations/`
- Always enable RLS on new tables
- Expose tables via `public.*` views with `security_invoker = true`
- Grant SELECT/INSERT/UPDATE/DELETE on public views as needed
- Admin operations crossing RLS: use `SECURITY DEFINER` RPC functions in `public`
- After any migration: `npm run gen:types`
- Never edit `src/app/core/supabase/database.types.ts` manually

## Auth & multi-tenant

- Roles: `super_admin`, `organization_admin`, `user`
- Guards: `authGuard`, `guestGuard`, `roleGuard([...])`, `passwordChangeChildGuard`
- `organization_admin`: scoped to own organization (users, groups)
- `super_admin`: global users + CRUD all organizations via `/organizations`
- Inactive organization blocks app access (`canAccessApp`)
- `must_change_password` forces redirect to `/my-profile`
- User creation: RPC `create_user` (public signup disabled)

## UI (Spartan)

- Add components: `npx @spartan-ng/cli add <component>` → `shared/ui/`
- Import from `@app/shared/ui/<component>`
- Sidebar nav: `app-sidebar.component.ts` (main nav top, Administration section bottom)

## Forbidden

- NgModules (standalone only)
- Bootstrap or other CSS frameworks
- Static imports of all feature pages in `app.routes.ts`
- Business logic in `shared/ui/`
- `confirm()` for destructive actions — use a dialog
- Editing generated `database.types.ts`

## Reference implementations

| Pattern | Location |
|---------|----------|
| Full CRUD + filters + delete modal | `features/users` |
| CRUD + members | `features/groups` |
| Global super_admin CRUD | `features/organizations` |
| Self-service profile + RPC | `features/profile` |
| Login + guards | `features/auth`, `core/auth` |

## Further reading

- [doc/ai/README.md](doc/ai/README.md) — documentation index
- [doc/ai/crud-pattern.md](doc/ai/crud-pattern.md) — step-by-step CRUD walkthrough
- [doc/ai/new-feature-checklist.md](doc/ai/new-feature-checklist.md) — 12-step checklist
- [doc/ai/supabase-conventions.md](doc/ai/supabase-conventions.md) — RLS, RPC, views
- [doc/architecture/auth-and-multi-tenant.md](doc/architecture/auth-and-multi-tenant.md) — auth deep dive
