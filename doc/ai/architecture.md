# Architecture

## Principle

GisForge wins through **predictability**: the AI always finds the same structure, conventions, and UI vocabulary.

```
Prompt → fixed conventions → predictable code → few surprises
```

## Repository layout

```
gis-forge/
├── src/app/
│   ├── app.config.ts              # global providers
│   ├── app.routes.ts              # root routes + lazy loading
│   ├── core/                      # singletons — no business features
│   │   ├── auth/                  # AuthService, guards
│   │   ├── layout/                # AppLayout, AppSidebar
│   │   └── supabase/              # SupabaseService, database.types.ts
│   ├── shared/ui/                 # Spartan Helm components (copied)
│   └── features/                  # 1 folder = 1 domain = 1 lazy chunk
│       ├── dashboard/
│       ├── users/                 # reference CRUD
│       ├── groups/
│       ├── organizations/
│       ├── profile/
│       └── auth/
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── config.toml
├── doc/                           # documentation
├── scripts/                       # tooling scripts
├── AGENTS.md                      # AI entry point
└── components.json                # Spartan CLI config
```

## Layering

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Route | `app.routes.ts` + `*.routes.ts` | URL mapping, guards |
| Layout | `core/layout/` | Shell (sidebar, header) |
| Page | `features/*/*.page.ts` | Thin view, injects service |
| Service | `features/*/*.service.ts` | Data + state (signals) |
| Types | `features/*/*.types.ts` | DTOs and view models |
| UI primitives | `shared/ui/` | Spartan Helm only |
| Database | `supabase/migrations/` | Schema, RLS, RPC |

## Data flow

```
Component (page) → Service (signals) → Supabase client → public view → RLS → table
```

Pages never call Supabase directly.

## Lazy loading

Every feature is lazy-loaded:

```typescript
// app.routes.ts
{
  path: 'users',
  canActivate: [roleGuard(['super_admin', 'organization_admin'])],
  loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES),
}
```

```typescript
// users.routes.ts
export const USERS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./users.page').then(m => m.UsersPage) },
];
```

## Import alias

`@app/*` maps to `src/app/*` (see `tsconfig.json`).

Spartan UI components use dedicated paths: `@app/shared/ui/button`, `@app/shared/ui/dialog`, etc.

## Reference implementations

| Pattern | Location |
|---------|----------|
| Full CRUD + filters + delete modal | `features/users` |
| CRUD + member assignment | `features/groups` |
| Global super_admin CRUD | `features/organizations` |
| Self-service profile | `features/profile` |
| Login + guards | `features/auth`, `core/auth` |
